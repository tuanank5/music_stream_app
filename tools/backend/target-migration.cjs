const { FieldValue } = require("firebase-admin/firestore");
const {
  auditSchema,
  readAuditDocuments,
  FIELDS,
} = require("./schema-audit.cjs");
const {
  planProfileMigration,
  fingerprint,
  encode,
} = require("./profile-migration.cjs");
const { PROFILE_MIGRATION } = require("./profiles.cjs");
const TARGET_MIGRATION = "migrations/target-schema-v1";

function privacy(kind, value) {
  if (typeof value.isPublic === "boolean") return value.isPublic;
  if (kind === "albums") return value.isPublished === true;
  if (value.visibility !== "public") return false;
  return kind === "playlists" || value.isPublished === true;
}
function planTargetMigration(
  documents,
  { mode = "cloud", profilesMigrated = false } = {},
) {
  const profileDocs = documents.filter((row) =>
    /^users\/[^/]+$|^publicProfiles\/[^/]+$|^users\/[^/]+\/following\/[^/]+$/.test(
      row.path,
    ),
  );
  const profiles = planProfileMigration(profileDocs, {
    migrated: profilesMigrated,
  });
  const raw = auditSchema(documents, {
    mode,
    profileSource: profilesMigrated ? "users" : "legacy",
    maxIssues: 1000000,
  });
  // Defaultable legacy omissions are normalized below. Ambiguous/conflicting
  // privacy, unknown fields and IDs must never disappear through a whitelist.
  const blockedCodes = new Set([
    "unreviewed_field",
    "ambiguous_privacy",
    "conflicting_privacy",
    "unknown_visibility",
    "duplicate_id_conflict",
    "relation_id_conflict",
    "unexpected_path",
  ]);
  const errors = [
    ...profiles.errors,
    ...raw.issues.filter(
      (issue) => issue.severity === "error" && blockedCodes.has(issue.code),
    ),
  ];
  const counters = new Map(
    profiles.reconciliation.map((row) => [row.uid, row]),
  );
  const normalized = [],
    changes = [];
  for (const row of documents) {
    const parts = row.path.split("/"),
      kind = parts.at(-2),
      id = parts.at(-1),
      x = row.data;
    if (kind === "publicProfiles") {
      normalized.push(row);
      continue;
    }
    if (!FIELDS[kind]) continue;
    const target = {};
    for (const field of FIELDS[kind].split(" "))
      if (Object.hasOwn(x, field)) target[field] = x[field];
    if (["users", "songs", "albums"].includes(kind)) {
      for (const prefix of kind === "users"
        ? ["avatar"]
        : kind === "songs"
          ? ["cover", "audio"]
          : ["cover"])
        target[`${prefix}PublicId`] ??= null;
    }
    if (kind === "users") {
      const counts = counters.get(id);
      if (counts) {
        target.followerCount = counts.followerCount;
        target.followingCount = counts.followingCount;
      }
      target.avatarUrl ??= x.photoURL || "";
      target.biography ??= "";
    }
    if (["songs", "albums", "playlists"].includes(kind)) {
      target.isPublic = privacy(kind, x);
      target.description ??= "";
    }
    if (
      ["users", "songs", "albums", "playlists", "posts", "comments"].includes(
        kind,
      )
    )
      target.updatedAt ??= x.createdAt;
    if (["songs", "albums"].includes(kind)) {
      target.coverUrl ??= x.cover || "";
      target.releaseDate ??= x.createdAt;
    }
    if (kind === "songs") {
      target.albumId =
        x.albumId === undefined || x.albumId === "" ? null : x.albumId;
      target.lyric ??= x.lyrics || "";
    }
    if (kind === "posts")
      target.songId =
        x.songId === undefined || x.songId === "" ? null : x.songId;
    // Undefined cannot be written by Firestore. Leave missing fields out so
    // strict validation reports them instead of inventing dates or media.
    for (const field of Object.keys(target))
      if (target[field] === undefined) delete target[field];
    normalized.push({ ...row, data: target });
    const removed = Object.keys(x).filter(
      (field) => !Object.hasOwn(target, field),
    );
    const changed = Object.keys(target).some(
      (field) => JSON.stringify(target[field]) !== JSON.stringify(x[field]),
    );
    if (removed.length || changed)
      changes.push({ path: row.path, data: target, removed });
  }
  const audit = auditSchema(normalized, {
    mode,
    profileSource: "users",
    strictTarget: true,
    maxIssues: 1000000,
  });
  errors.push(...audit.issues.filter((issue) => issue.severity === "error"));
  return {
    documents: normalized,
    changes,
    errors,
    audit,
    sourceDocuments: documents.length,
    localApplySupported: documents.length <= 400,
    restrictedLegacySongs: raw.legacyPrivacyDocuments,
  };
}
async function migrateTargetSchema(
  db,
  { apply = false, maintenance = false, backupFile } = {},
) {
  if (
    apply &&
    (!db.projectId.startsWith("demo-") ||
      !process.env.FIRESTORE_EMULATOR_HOST ||
      !maintenance ||
      !backupFile)
  )
    throw new Error(
      "Target apply requires a demo Emulator, --maintenance and --backup FILE. Cloud apply is not supported.",
    );
  if (apply) require("../local/environment.cjs").localEnvironment();
  const targetRef = db.doc(TARGET_MIGRATION),
    profileRef = db.doc(PROFILE_MIGRATION);
  const [targetMarker, profileMarker] = await db.getAll(targetRef, profileRef);
  if (
    (targetMarker.exists && targetMarker.data().status !== "completed") ||
    (profileMarker.exists && profileMarker.data().status !== "completed")
  )
    throw new Error("Incomplete migration marker; inspect before continuing.");
  const source = await readAuditDocuments(db);
  const plan = planTargetMigration(source, {
    mode: process.env.FIRESTORE_EMULATOR_HOST ? "emulator" : "cloud",
    profilesMigrated: profileMarker.exists,
  });
  const report = {
    mode: apply ? "apply" : "dry-run",
    migrated: targetMarker.exists,
    sourceDocuments: plan.sourceDocuments,
    changes: plan.changes.map(({ path, removed }) => ({ path, removed })),
    errors: plan.errors,
    warnings: plan.audit.warnings,
    restrictedLegacySongs: plan.restrictedLegacySongs,
    localApplySupported: plan.localApplySupported,
  };
  if (!apply) return report;
  if (plan.errors.length)
    throw new Error(
      "Target validation failed; no writes. Inspect dry-run report.",
    );
  if (targetMarker.exists) {
    if (plan.changes.length)
      throw new Error(
        "Target marker exists but documents need changes; inspect instead of reapplying.",
      );
    return report;
  }
  if (!plan.localApplySupported)
    throw new Error(
      "Atomic target apply supports at most 400 source documents; no writes.",
    );
  const fs = require("node:fs"),
    path = require("node:path"),
    file = path.resolve(backupFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        version: 2,
        projectId: db.projectId,
        migration: TARGET_MIGRATION,
        createdAt: new Date().toISOString(),
        documents: source.map(({ path, data }) => ({
          path,
          data: encode(data),
        })),
        plannedDocuments: plan.documents.map(({ path, data }) => ({
          path,
          data: encode(data),
        })),
        markers: [targetMarker, profileMarker].map((doc) => ({
          path: doc.ref.path,
          data: doc.exists ? encode(doc.data()) : null,
        })),
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  const expected = fingerprint(source);
  await db.runTransaction(async (tx) => {
    const [target, profile] = await Promise.all([
      tx.get(targetRef),
      tx.get(profileRef),
    ]);
    if (
      target.exists ||
      profile.exists !== profileMarker.exists ||
      (profile.exists && !profile.updateTime.isEqual(profileMarker.updateTime))
    )
      throw new Error("Migration marker changed; no writes.");
    const current = await readAuditDocuments(db, { tx, maxDocuments: 400 });
    if (fingerprint(current) !== expected)
      throw new Error(
        "Source changed after backup; no writes. Stop writers and repeat with a new backup.",
      );
    for (const change of plan.changes) tx.set(db.doc(change.path), change.data);
    if (!profile.exists)
      tx.create(profileRef, {
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        sourceDocuments: source.length,
      });
    tx.create(targetRef, {
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      sourceDocuments: source.length,
    });
  });
  return { ...report, migrated: true, backupFile: file };
}
module.exports = { planTargetMigration, migrateTargetSchema, TARGET_MIGRATION };
