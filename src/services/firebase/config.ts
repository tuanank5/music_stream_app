import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { resolveFirebaseRuntime } from "./runtime";

export function getFirebaseRuntime() {
  // Expo only inlines direct process.env.EXPO_PUBLIC_* access.
  return resolveFirebaseRuntime({
    EXPO_PUBLIC_FIREBASE_MODE: process.env.EXPO_PUBLIC_FIREBASE_MODE,
    EXPO_PUBLIC_FIREBASE_API_KEY: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    EXPO_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    EXPO_PUBLIC_FIREBASE_APP_ID: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    EXPO_PUBLIC_EMULATOR_HOST: process.env.EXPO_PUBLIC_EMULATOR_HOST,
    EXPO_PUBLIC_AUTH_EMULATOR_PORT: process.env.EXPO_PUBLIC_AUTH_EMULATOR_PORT,
    EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT:
      process.env.EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT,
    EXPO_PUBLIC_BACKEND_URL: process.env.EXPO_PUBLIC_BACKEND_URL,
  });
}

export function getFirebaseSetupError(): string {
  try {
    getFirebaseRuntime();
    return "";
  } catch (error) {
    return error instanceof Error
      ? error.message
      : "Cấu hình Firebase không hợp lệ.";
  }
}

export function isFirebaseConfigured(): boolean {
  return !getFirebaseSetupError();
}

/** Single Firebase app instance for the client SDK. */
export function getFirebaseApp(): FirebaseApp {
  const { config, mode } = getFirebaseRuntime();
  // Separate app names also isolate persisted Auth sessions between environments.
  const name = mode === "emulator" ? "local-demo-music-stream" : "[DEFAULT]";
  const existing = getApps().find((app) => app.name === name);
  if (existing) {
    if (existing.options.projectId !== config.projectId)
      throw new Error(
        "Firebase project đã thay đổi. Khởi động lại app để tránh lẫn môi trường.",
      );
    return existing;
  }
  return initializeApp(config, name);
}
