const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const { createBackend } = require("./service.cjs");
if (
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw Error("Cloud backend refuses emulator variables");
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
if (
  !projectId ||
  projectId.startsWith("demo-") ||
  !process.env.CURSOR_SECRET ||
  process.env.CURSOR_SECRET.length < 32
)
  throw Error("Set real GOOGLE_CLOUD_PROJECT and CURSOR_SECRET (32+ chars)");
const app = initializeApp({ projectId, credential: applicationDefault() });
createBackend({
  db: getFirestore(app),
  auth: getAuth(app),
  projectId,
  secret: process.env.CURSOR_SECRET,
  mode: "cloud",
  origins: (process.env.ALLOWED_ORIGINS || "").split(",").filter(Boolean),
})
  .then((server) => {
    server.listen(Number(process.env.PORT || 8080), "0.0.0.0");
    for (const signal of ["SIGINT", "SIGTERM"])
      process.on(signal, () => {
        server.closeAllConnections();
        server.close();
      });
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
