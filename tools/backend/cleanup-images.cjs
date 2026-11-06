// Explicit maintenance command; no image destruction is scheduled by the API.
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { cleanImages } = require("./image-assets.cjs");
async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => !["--apply", "--maintenance"].includes(arg)))
    throw Error("Use [--apply --maintenance]; default is dry-run");
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (
    !projectId ||
    projectId.startsWith("demo-") ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw Error(
      "Requires explicit cloud project and credentials; refuses Emulator",
    );
  const apply = args.includes("--apply");
  if (apply && !args.includes("--maintenance"))
    throw Error(
      "Apply requires --maintenance after backup and pausing external writers/importers",
    );
  const app = initializeApp({ projectId, credential: applicationDefault() });
  try {
    console.log(
      JSON.stringify(
        {
          projectId,
          apply,
          images: await cleanImages(getFirestore(app), { apply }),
        },
        null,
        2,
      ),
    );
  } finally {
    await require("firebase-admin/app").deleteApp(app);
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
