import { connectAuthEmulator, type Auth } from "firebase/auth";
import { connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getFirebaseRuntime } from "./config";

const connectedAuth = new WeakSet<Auth>();
const connectedDb = new WeakSet<Firestore>();

export function connectLocalAuth(auth: Auth): void {
  const { emulator } = getFirebaseRuntime();
  if (!emulator || connectedAuth.has(auth)) return;
  connectAuthEmulator(auth, `http://${emulator.host}:${emulator.authPort}`);
  connectedAuth.add(auth);
}

export function connectLocalDb(db: Firestore): void {
  const { emulator } = getFirebaseRuntime();
  if (!emulator || connectedDb.has(db)) return;
  connectFirestoreEmulator(db, emulator.host, emulator.firestorePort);
  connectedDb.add(db);
}
