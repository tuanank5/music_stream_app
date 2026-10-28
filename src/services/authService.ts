import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { cleanText, httpsUrl, validateRegister } from "../utils/validation";
export async function register(
  name: string,
  email: string,
  password: string,
  confirm: string,
) {
  const v = validateRegister(name, email, password, confirm);
  const result = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    v.email,
    password,
  );
  // Account creation and Firestore are separate operations; a profile failure must not imply account creation failed.
  let profileSaved = true;
  try {
    await updateProfile(result.user, { displayName: v.displayName });
    await setDoc(doc(getFirebaseDb(), "users", result.user.uid), {
      displayName: v.displayName,
      email: v.email,
      photoURL: "",
      createdAt: serverTimestamp(),
    });
  } catch {
    profileSaved = false;
  }
  return { user: result.user, profileSaved };
}
export function login(email: string, password: string) {
  return signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
}
export function logout() {
  return signOut(getFirebaseAuth());
}
export function resetPassword(email: string) {
  if (!email.trim()) throw new Error("Nhập email trước.");
  return sendPasswordResetEmail(getFirebaseAuth(), email.trim());
}
export async function saveProfile(name: string, image: string) {
  const auth = getFirebaseAuth(),
    user = auth.currentUser;
  if (!user) throw new Error("Cần đăng nhập.");
  const displayName = cleanText(name, "tên hiển thị", 80),
    photoURL = httpsUrl(image, "ảnh đại diện");
  await updateProfile(user, { displayName, photoURL });
  await setDoc(
    doc(getFirebaseDb(), "users", user.uid),
    { displayName, email: user.email ?? "", photoURL },
    { merge: true },
  );
}
