import { Auth, getAuth } from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "./config";
import { connectLocalAuth } from "./emulators";

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Auth requires EXPO_PUBLIC_FIREBASE_* environment variables.",
    );
  }
  if (!authInstance) {
    const auth = getAuth(getFirebaseApp());
    connectLocalAuth(auth);
    authInstance = auth;
  }
  return authInstance;
}
