const { Timestamp } = require("firebase-admin/firestore");
const { readAuditDocuments } = require("./schema-audit.cjs");
const { encode } = require("./profile-migration.cjs");
const { TARGET_MIGRATION } = require("./target-migration.cjs");
const { PROFILE_MIGRATION } = require("./profiles.cjs");
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
function decode(value) {
  if (value && value.__type === "timestamp")
    return new Timestamp(value.seconds, value.nanoseconds);
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, decode(item)]),
    );
  return value;
}
async function restoreTargetSchema(
  db,
  { apply = false, maintenance = false, backupFile } = {},
) {
  if (
    !db.projectId.startsWith("demo-") ||
    !process.env.FIRESTORE_EMULATOR_HOST ||
    !backupFile ||
    (apply && !maintenance)
  )
    throw new Error(
      "Restore is Emulator-only and requires --backup FILE, plus --maintenance for apply.",
    );
  require("../local/environment.cjs").localEnvironment();
  const backup = JSON.parse(
    require("node:fs").readFileSync(backupFile, "utf8"),
  );
  if (
    backup.version !== 2 ||
    backup.projectId !== db.projectId ||
    backup.migration !== TARGET_MIGRATION ||
    !Array.isArray(backup.documents) ||
    !Array.isArray(backup.plannedDocuments) ||
    !Array.isArray(backup.markers) ||
    backup.documents.length > 400
  )
    throw new Error("Invalid target backup version/project/size; no writes.");
  const allowedPath = (path) =>
    /^(users|songs|albums|posts|publicProfiles)\/[^/]+$|^users\/[^/]+\/(playlists|following|favorites|favoriteAlbums|history|playReceipts)\/[^/]+$|^posts\/[^/]+\/comments\/[^/]+$/.test(
      path,
    );
  const sourcePaths = backup.documents.map((row) => row.path),
    plannedPaths = backup.plannedDocuments.map((row) => row.path);
  if (
    new Set(sourcePaths).size !== sourcePaths.length ||
    sourcePaths.some((p) => !allowedPath(p)) ||
    JSON.stringify([...sourcePaths].sort()) !==
      JSON.stringify([...plannedPaths].sort()) ||
    backup.markers.length !== 2 ||
    new Set(backup.markers.map((m) => m.path)).size !== 2 ||
    backup.markers.some(
      (m) => ![TARGET_MIGRATION, PROFILE_MIGRATION].includes(m.path),
    )
  )
    throw new Error("Invalid backup document paths/markers; no writes.");
  const key = (rows) =>
    JSON.stringify(
      canonical([...rows].sort((a, b) => a.path.localeCompare(b.path))),
    );
  const expected = key(backup.plannedDocuments);
  const validateCurrent = async (tx) => {
    const refs = backup.markers.map((row) => db.doc(row.path));
    const markers = tx
      ? await Promise.all(refs.map((ref) => tx.get(ref)))
      : await db.getAll(...refs);
    if (markers.some((doc) => !doc.exists || doc.data().status !== "completed"))
      throw new Error(
        "Restore requires completed migration markers; no writes.",
      );
    const current = await readAuditDocuments(db, { tx, maxDocuments: 400 });
    if (
      key(current.map(({ path, data }) => ({ path, data: encode(data) }))) !==
      expected
    )
      throw new Error(
        "Data changed after migration; refusing to overwrite newer data.",
      );
  };
  await validateCurrent();
  if (!apply)
    return {
      mode: "dry-run",
      projectId: db.projectId,
      restorable: true,
      documents: backup.documents.length,
    };
  await db.runTransaction(async (tx) => {
    await validateCurrent(tx);
    for (const row of backup.documents)
      tx.set(db.doc(row.path), decode(row.data));
    for (const marker of backup.markers)
      if (marker.data === null) tx.delete(db.doc(marker.path));
      else tx.set(db.doc(marker.path), decode(marker.data));
  });
  return {
    mode: "apply",
    projectId: db.projectId,
    restored: true,
    documents: backup.documents.length,
  };
}
module.exports = { restoreTargetSchema };
