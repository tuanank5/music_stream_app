import { FirebaseApp, getApp, getApps, initializeApp } from "firebase/app";
import { Platform } from "react-native";

export type FirebaseClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function readConfigFromEnv(): FirebaseClientConfig | null {
  const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId =
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.EXPO_PUBLIC_FIREBASE_APP_ID;

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

export function isFirebaseConfigured(): boolean {
  return readConfigFromEnv() !== null;
}

/** Single Firebase app instance for the client SDK. */
export function getFirebaseApp(): FirebaseApp {
  const config = readConfigFromEnv();
  if (!config) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env and set EXPO_PUBLIC_FIREBASE_* values.",
    );
  }
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(config);
}

export function getFirebaseRuntimePlatform(): "web" | "native" {
  return Platform.OS === "web" ? "web" : "native";
}
