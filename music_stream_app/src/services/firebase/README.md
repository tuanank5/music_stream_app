# Firebase integration

## Client setup

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_FIREBASE_*` from Firebase Console (Web app config).
2. Import `getFirebaseApp`, `getFirebaseAuth`, and `isFirebaseConfigured` from `./index` or this folder.

## Auth persistence (firebase@12.19.0)

- **Web:** `getAuth()` uses browser persistence (`auth.web.ts`).
- **iOS/Android:** `auth.native.ts` uses `initializeAuth` + `getReactNativePersistence(AsyncStorage)`.
- **TypeScript:** `getReactNativePersistence` is not on the default `firebase/auth` typings; see `src/types/firebase-auth-react-native.d.ts`.
- **Node/tsc default import test:** importing `getReactNativePersistence` from `firebase/auth` in Node returns `undefined` (expected); native builds use the RN bundle via Metro.

## Remaining work

- TODO (team: auth + backend): Firestore/Storage Security Rules before production uploads.
- TODO (team: admin + backend): custom claims or server-side admin provisioning.
