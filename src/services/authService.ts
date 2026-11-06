import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

import { backendGet, backendPatch, backendPost } from "./backendService";

import { getFirebaseAuth } from "./firebase";
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

  let profileSaved = true;

  try {
    await updateProfile(result.user, {
      displayName: v.displayName,
    });

    await saveProfile(v.displayName, "");
  } catch {
    profileSaved = false;
  }

  return {
    user: result.user,
    profileSaved,
  };
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
  const user = getFirebaseAuth().currentUser;

  if (!user) throw new Error("Cần đăng nhập.");

  const displayName = cleanText(name, "tên hiển thị", 80);
  const photoURL = httpsUrl(image, "ảnh đại diện");

  await updateProfile(user, {
    displayName,
    photoURL,
  });

  await ensureProfile();

  const profile = await backendGet<{ biography: string }>("/me");
  await backendPatch("/me", {
    displayName,
    avatarUrl: photoURL,
    biography: profile.biography,
  });
}
export async function ensureProfile() {
  if (!getFirebaseAuth().currentUser) return;
  await backendPost("/me/ensure", {});
}
