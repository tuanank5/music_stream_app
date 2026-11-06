const { spawn } = require("node:child_process");
const { resolve } = require("node:path");
const {
  resolveFirebaseRuntime,
} = require("../src/services/firebase/runtime.ts");

const host = process.env.LOCAL_APP_HOST || "127.0.0.1";
const env = {
  ...process.env,
  // The existing .env contains cloud settings. Never load it in this command.
  EXPO_NO_DOTENV: "1",
  EXPO_PUBLIC_FIREBASE_MODE: "emulator",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "demo-music-stream",
  EXPO_PUBLIC_EMULATOR_HOST: host,
  EXPO_PUBLIC_AUTH_EMULATOR_PORT: "9099",
  EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT: "8080",
  EXPO_PUBLIC_BACKEND_URL: `http://${host}:8787`,
  EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: "",
  EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET: "",
  EXPO_PUBLIC_CLOUDINARY_AUDIO_PRESET: "",
};
resolveFirebaseRuntime(env);
console.log(
  `Local demo-music-stream: Auth ${host}:9099, Firestore ${host}:8080, backend ${host}:8787. Uploads stored on local backend disk.`,
);
const child = spawn(
  process.execPath,
  [resolve("node_modules/expo/bin/cli"), "start", ...process.argv.slice(2)],
  { env, stdio: "inherit" },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
