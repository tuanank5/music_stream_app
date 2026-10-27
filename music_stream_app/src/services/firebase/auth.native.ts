import AsyncStorage from "@react-native-async-storage/async-storage";
import { Auth, getAuth, initializeAuth } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured } from "./config";

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Auth requires EXPO_PUBLIC_FIREBASE_* environment variables.");
  }
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code === "auth/already-initialized") {
      authInstance = getAuth(app);
    } else {
      throw error;
    }
  }

  return authInstance;
}
