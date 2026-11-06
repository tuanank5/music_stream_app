const { FieldPath, FieldValue } = require("firebase-admin/firestore");
const { PROFILE_MIGRATION } = require("./profiles.cjs");

function planProfileMigration(documents, { migrated = false } = {}) {
  const users = new Map(),
    profiles = new Map(),
    relations = [];
  const errors = [],
    plans = [],
    reconciliation = [];
  const seen = new Set();
  for (const row of documents) {
    if (seen.has(row.path))
      throw new Error(`Duplicate migration input: ${row.path}`);
    seen.add(row.path);
    let match;
    if ((match = /^users\/([^/]+)$/.exec(row.path))) users.set(match[1], row);
    else if ((match = /^publicProfiles\/([^/]+)$/.exec(row.path)))
      profiles.set(match[1], row);
    else if ((match = /^users\/([^/]+)\/following\/([^/]+)$/.exec(row.path)))
      relations.push({ ...row, owner: match[1], target: match[2] });
    else errors.push({ path: row.path, code: "unexpected_path" });
  }
  const actual = new Map(
    [...users.keys()].map((uid) => [
      uid,
      { followerCount: 0, followingCount: 0 },
    ]),
  );
  for (const relation of relations) {
    const { owner, target, data, path } = relation;
    if (!users.has(owner) || !users.has(target) || owner === target) {
      errors.push({ path, code: "invalid_follow_relation" });
      continue;
    }
    if (
      (data.userId !== undefined && data.userId !== target) ||
      (data.artistId !== undefined && data.artistId !== target)
    )
      errors.push({ path, code: "relation_id_conflict" });
    actual.get(owner).followingCount++;
    actual.get(target).followerCount++;
    if (!migrated && (data.userId !== undefined || data.artistId !== undefined))
      plans.push({ path, counters: null, remove: ["userId", "artistId"] });
  }
  for (const [uid, profile] of profiles)
    if (!users.has(uid))
      errors.push({ path: profile.path, code: "orphan_public_profile" });
  for (const [uid, user] of users) {
    const source = !migrated && profiles.has(uid) ? profiles.get(uid) : user;
    const counts = actual.get(uid);
    for (const key of ["followerCount", "followingCount"]) {
      if (!Number.isSafeInteger(source.data[key]) || source.data[key] < 0)
        errors.push({ path: source.path, code: "invalid_counter", field: key });
      else if (source.data[key] !== counts[key])
        errors.push({
          path: source.path,
          code: "counter_relation_mismatch",
          field: key,
          stored: source.data[key],
          relations: counts[key],
        });
    }
    if (user.data.userId !== undefined && user.data.userId !== uid)
      errors.push({ path: user.path, code: "user_id_conflict" });
    reconciliation.push({ uid, source: source.path, ...counts });
    if (!migrated)
      plans.push({
        path: user.path,
        counters: counts,
        remove: ["userId", "lastFollowingId"],
      });
  }
  return {
    errors,
    plans,
    reconciliation,
    users: users.size,
    relations: relations.length,
    legacyProfiles: profiles.size,
    // One atomic transaction, including the completion marker; never partially batch a graph.
    localApplySupported: documents.length <= 400,
  };
}

async function readProfileState(db, { tx, maxDocuments = 250000 } = {}) {
  const documents = [];
  for (const [name, group] of [
    ["users", false],
    ["publicProfiles", false],
    ["following", true],
  ]) {
    let cursor;
    do {
      let query = (group ? db.collectionGroup(name) : db.collection(name))
        .orderBy(FieldPath.documentId())
        .limit(200);
      if (cursor) query = query.startAfter(cursor);
      const page = await (tx ? tx.get(query) : query.get());
      for (const doc of page.docs) {
        if (documents.length >= maxDocuments)
          throw new Error(
            "Profile migration scan limit exceeded; no complete plan.",
          );
        documents.push({
          path: doc.ref.path,
          data: doc.data(),
          updateTime: doc.updateTime,
        });
      }
      cursor = page.size === 200 ? page.docs.at(-1) : null;
    } while (cursor);
  }
  return documents;
}
const fingerprint = (documents) =>
  JSON.stringify(
    documents
      .map((row) => [
        row.path,
        row.updateTime?.seconds,
        row.updateTime?.nanoseconds,
      ])
      .sort((a, b) => a[0].localeCompare(b[0])),
  );
function encode(value) {
  if (value?.toMillis && Number.isInteger(value.seconds))
    return {
      __type: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object") {
    if (Object.hasOwn(value, "__type"))
      throw new Error(
        "Reserved backup type tag in source; refusing ambiguous backup.",
      );
    if (value.constructor !== Object)
      throw new Error(
        "Unsupported Firestore type in backup; refusing lossy backup.",
      );
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, encode(item)]),
    );
  }
  return value;
}
async function migrateProfiles(
  db,
  { apply = false, backupFile, maintenance = false } = {},
) {
  // Applying remains Emulator-only until the full target-schema rollout is ready.
  if (
    apply &&
    (!db.projectId.startsWith("demo-") ||
      !process.env.FIRESTORE_EMULATOR_HOST ||
      !maintenance ||
      !backupFile)
  )
    throw new Error(
      "Apply requires a demo Emulator, --maintenance and --backup FILE; cloud apply is not supported.",
    );
  if (apply) require("../local/environment.cjs").localEnvironment();
  const marker = await db.doc(PROFILE_MIGRATION).get();
  if (marker.exists && marker.data().status !== "completed")
    throw new Error("Invalid migration marker; inspect before continuing.");
  const migrated = marker.exists && marker.data().status === "completed";
  const documents = await readProfileState(db);
  const plan = planProfileMigration(documents, { migrated });
  const report = {
    mode: apply ? "apply" : "dry-run",
    migrated,
    users: plan.users,
    relations: plan.relations,
    legacyProfiles: plan.legacyProfiles,
    errors: plan.errors,
    reconciliation: plan.reconciliation,
    writes: migrated ? 0 : plan.plans.length + 1,
    localApplySupported: plan.localApplySupported,
  };
  if (!apply || migrated) return report;
  if (plan.errors.length)
    throw new Error(
      "Profile reconciliation failed; no writes. Run dry-run for details.",
    );
  if (!plan.localApplySupported)
    throw new Error(
      "Atomic local apply supports at most 400 source documents; no writes.",
    );
  const fs = require("node:fs"),
    path = require("node:path");
  const file = path.resolve(backupFile);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        version: 1,
        projectId: db.projectId,
        migration: PROFILE_MIGRATION,
        createdAt: new Date().toISOString(),
        documents: documents.map((row) => ({
          path: row.path,
          data: encode(row.data),
        })),
      },
      null,
      2,
    ) + "\n",
    { flag: "wx" },
  );
  const expected = fingerprint(documents);
  await db.runTransaction(async (tx) => {
    const currentMarker = await tx.get(db.doc(PROFILE_MIGRATION));
    if (currentMarker.exists)
      throw new Error("Migration marker changed; inspect before retrying.");
    const current = await readProfileState(db, { tx, maxDocuments: 400 });
    if (fingerprint(current) !== expected)
      throw new Error(
        "Source changed after backup; no writes. Stop writers and repeat with a fresh backup.",
      );
    for (const item of plan.plans) {
      const changes = { ...item.counters };
      for (const field of item.remove) changes[field] = FieldValue.delete();
      tx.update(db.doc(item.path), changes);
    }
    tx.create(db.doc(PROFILE_MIGRATION), {
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      sourceDocuments: documents.length,
    });
  });
  return { ...report, migrated: true, backupFile: file };
}
module.exports = {
  planProfileMigration,
  readProfileState,
  migrateProfiles,
  fingerprint,
  encode,
};
