import { getFirestore } from "firebase/firestore";
import { getFirebaseApp } from "./config";
export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}
