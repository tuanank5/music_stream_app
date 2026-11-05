// Dry-run is the default. Never resets users or deletes source documents.
const { projectProfile } = require("./profiles.cjs");
async function main() {
  const args = process.argv.slice(2),
    apply = args.includes("--apply");
  let db;
  if (args.includes("--local")) {
    const {
      configureLocalAdmin,
      checkEmulators,
    } = require("../local/environment.cjs");
    const config = configureLocalAdmin();
    await checkEmulators(config.env);
    db = config.db;
  } else {
    const project = args[args.indexOf("--project") + 1];
    if (
      !args.includes("--project") ||
      !project ||
      project.startsWith("demo-") ||
      process.env.FIRESTORE_EMULATOR_HOST
    )
      throw Error("Specify --local or --project REAL_ID (dry-run default).");
    const { initializeApp, applicationDefault } = require("firebase-admin/app");
    db = require("firebase-admin/firestore").getFirestore(
      initializeApp({ projectId: project, credential: applicationDefault() }),
    );
  }
  const { FieldPath } = require("firebase-admin/firestore");
  let cursor,
    counts = { create: 0, update: 0, delete: 0, unchanged: 0 };
  do {
    let query = db
      .collection("users")
      .orderBy(FieldPath.documentId())
      .limit(100);
    if (cursor) query = query.startAfter(cursor);
    const page = await query.get();
    for (const user of page.docs) {
      const result = await projectProfile(db, user.id, !apply);
      counts[result.action]++;
    }
    cursor = page.size === 100 ? page.docs.at(-1) : null;
  } while (cursor);
  console.log(
    JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      projectId: db.projectId,
      counts,
    }),
  );
}
if (require.main === module)
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error.message);
      process.exit(1);
    });
module.exports = { main };
