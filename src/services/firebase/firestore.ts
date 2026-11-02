import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./config";
import { connectLocalDb } from "./emulators";
export function getFirebaseDb() {
  const db = getFirestore(getFirebaseApp());
  connectLocalDb(db);
  return db;
}
