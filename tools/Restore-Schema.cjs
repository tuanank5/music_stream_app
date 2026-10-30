const fs = require("node:fs"),
  admin = require("firebase-admin");
const args = process.argv.slice(2),
  at = args.indexOf("--file");
if (at < 0 || !args[at + 1])
  throw new Error("node restore-schema-v2.cjs --file BACKUP.json [--confirm]");
const backup = JSON.parse(fs.readFileSync(args[at + 1], "utf8"));
console.log(
  "Project backup:",
  backup.projectId,
  "Documents:",
  backup.documents.length,
);
if (!args.includes("--confirm")) {
  console.log(
    "Dry run. --confirm sẽ khôi phục và xóa các path do migration tạo mới. Chỉ dùng ngay khi rollback, trước khi người dùng ghi dữ liệu mới.",
  );
  process.exit(0);
}
admin.initializeApp({
  projectId: backup.projectId,
  ...(process.env.FIRESTORE_EMULATOR_HOST
    ? {}
    : { credential: admin.credential.applicationDefault() }),
});
const db = admin.firestore();
function decode(v) {
  if (v?.__firestoreType === "timestamp")
    return new admin.firestore.Timestamp(v.seconds, v.nanoseconds);
  if (v?.__firestoreType === "geopoint")
    return new admin.firestore.GeoPoint(v.latitude, v.longitude);
  if (v?.__firestoreType === "reference") return db.doc(v.path);
  if (v?.__firestoreType === "bytes") return Buffer.from(v.value, "base64");
  if (Array.isArray(v)) return v.map(decode);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, decode(x)]),
    );
  return v;
}
(async () => {
  const old = new Set(backup.documents.map((x) => x.path));
  const operations = [
    ...backup.documents.map((x) => ({ path: x.path, data: decode(x.data) })),
    ...(backup.plannedPaths || [])
      .filter((x) => !old.has(x))
      .map((path) => ({ path, remove: true })),
  ];
  for (let i = 0; i < operations.length; i += 350) {
    const b = db.batch();
    for (const x of operations.slice(i, i + 350)) {
      if (x.remove) b.delete(db.doc(x.path));
      else b.set(db.doc(x.path), x.data);
    }
    await b.commit();
  }
  await db.doc("migrations/schema-v2").delete();
  console.log(
    "Đã restore dữ liệu. Deploy lại Rules cũ và code cũ nếu rollback.",
  );
})()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.terminate());
