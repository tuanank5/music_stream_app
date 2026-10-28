import { getFirebaseApp, isFirebaseConfigured } from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
// Metro selects Firebase RN implementation. Its RN-only export is not in web typings.
const { getReactNativePersistence } = FirebaseAuth as unknown as {
  getReactNativePersistence: (
    storage: typeof AsyncStorage,
  ) => FirebaseAuth.Persistence;
};

let authInstance: FirebaseAuth.Auth | null = null;

export function getFirebaseAuth(): FirebaseAuth.Auth {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase Auth requires EXPO_PUBLIC_FIREBASE_* environment variables.",
    );
  }
  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  try {
    authInstance = FirebaseAuth.initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error: unknown) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: string }).code)
        : "";
    if (code === "auth/already-initialized") {
      authInstance = FirebaseAuth.getAuth(app);
    } else {
      throw error;
    }
  }

  return authInstance;
}
