const {
  initializeApp,
  applicationDefault,
  deleteApp,
} = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { createInterface } = require("node:readline/promises");

const PROJECT = "musicstreamapp-5a527";

async function resetUsers(auth, apply = false) {
  // Snapshot IDs before deleting so pagination cannot skip users after mutations.
  const uids = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    uids.push(...page.users.map((user) => user.uid));
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`Project: ${PROJECT}. Authentication accounts: ${uids.length}.`);
  if (!apply) {
    console.log("Dry-run only. Add --apply to delete these accounts.");
    return;
  }
  let deleted = 0;
  for (let offset = 0; offset < uids.length; offset += 1000) {
    const result = await auth.deleteUsers(uids.slice(offset, offset + 1000));
    deleted += result.successCount;
    console.log(
      `Deleted: ${deleted}/${uids.length}; batch failures: ${result.failureCount}.`,
    );
    if (result.failureCount)
      throw Error(
        "Some accounts could not be deleted. Stopped; rerun dry-run to inspect remaining count.",
      );
  }
  const remaining = await auth.listUsers(1);
  if (remaining.users.length)
    throw Error(
      "Accounts remain or new signups occurred. Stop clients and rerun.",
    );
  console.log("Authentication is empty. Firestore and media were not changed.");
}

async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply"))
    throw Error("Use: node tools/reset-auth.cjs [--apply]");
  if (
    process.env.FIREBASE_AUTH_EMULATOR_HOST ||
    process.env.FIRESTORE_EMULATOR_HOST
  )
    throw Error(
      "Unset emulator variables; this script targets the cloud project.",
    );
  for (const key of ["GOOGLE_CLOUD_PROJECT", "GCLOUD_PROJECT"])
    if (process.env[key] && process.env[key] !== PROJECT)
      throw Error(`${key} differs from ${PROJECT}.`);
  const apply = args.includes("--apply");
  if (apply) {
    const prompt = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      const answer = await prompt.question(
        `Permanently delete ALL Authentication accounts? Type ${PROJECT}: `,
      );
      if (answer.trim() !== PROJECT)
        throw Error("Project confirmation did not match. Nothing deleted.");
    } finally {
      prompt.close();
    }
  }
  const app = initializeApp(
    { projectId: PROJECT, credential: applicationDefault() },
    "reset-auth",
  );
  try {
    await resetUsers(getAuth(app), apply);
  } finally {
    await deleteApp(app);
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { resetUsers };
