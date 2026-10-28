import { Auth, getAuth } from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "./config";

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Auth requires EXPO_PUBLIC_FIREBASE_* environment variables.",
    );
  }
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}
