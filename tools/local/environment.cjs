const {
  isLocalHost,
  LOCAL_PROJECT_ID,
} = require("../../src/services/firebase/runtime.ts");

function endpoint(value, fallback) {
  const address = value || fallback;
  const parts = address.split(":");
  if (
    parts.length !== 2 ||
    !isLocalHost(parts[0]) ||
    !/^\d+$/.test(parts[1]) ||
    Number(parts[1]) < 1 ||
    Number(parts[1]) > 65535
  )
    throw new Error(`Refusing non-local emulator endpoint: ${address}`);
  return address;
}

function localEnvironment(input = process.env) {
  for (const key of [
    "GCLOUD_PROJECT",
    "GOOGLE_CLOUD_PROJECT",
    "LOCAL_FIREBASE_PROJECT_ID",
  ]) {
    if (input[key] && input[key] !== LOCAL_PROJECT_ID)
      throw new Error(
        `${key} must be ${LOCAL_PROJECT_ID}; this tool cannot target a cloud project.`,
      );
  }
  return {
    ...input,
    GCLOUD_PROJECT: LOCAL_PROJECT_ID,
    GOOGLE_CLOUD_PROJECT: LOCAL_PROJECT_ID,
    FIREBASE_AUTH_EMULATOR_HOST: endpoint(
      input.FIREBASE_AUTH_EMULATOR_HOST,
      "127.0.0.1:9099",
    ),
    FIRESTORE_EMULATOR_HOST: endpoint(
      input.FIRESTORE_EMULATOR_HOST,
      "127.0.0.1:8080",
    ),
    // Keep the CLI cache inside this workspace instead of writing to the user profile.
    FIREBASE_EMULATORS_PATH: require("node:path").resolve(
      __dirname,
      "../../.local/emulators",
    ),
    FIREBASE_CLI_DISABLE_UPDATE_CHECK: "1",
  };
}

function configureLocalAdmin() {
  const env = localEnvironment();
  Object.assign(process.env, env);
  const { initializeApp, getApps } = require("firebase-admin/app");
  const { getFirestore } = require("firebase-admin/firestore");
  const { getAuth } = require("firebase-admin/auth");
  const name = "local-tooling";
  const app =
    getApps().find((item) => item.name === name) ||
    initializeApp({ projectId: LOCAL_PROJECT_ID }, name);
  return { app, db: getFirestore(app), auth: getAuth(app), env };
}

async function checkEmulators(env) {
  // Fail before seeding/listening if either service is absent. No cloud fallback.
  const urls = [
    `http://${env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${LOCAL_PROJECT_ID}/config`,
    `http://${env.FIRESTORE_EMULATOR_HOST}/`,
  ];
  await Promise.all(
    urls.map(async (url) => {
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!response.ok)
        throw new Error(`Emulator unavailable (${response.status}): ${url}`);
    }),
  );
}

module.exports = { localEnvironment, configureLocalAdmin, checkEmulators };
