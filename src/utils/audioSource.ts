import type { FirebaseRuntime } from "../services/firebase/runtime";

export function isLocalDemoAudio(value: string): boolean {
  return /^\/local-audio\/sample-(long|short)\.wav$/.test(value);
}
export function isLocalMedia(value: string): boolean {
  return /^\/local-media\/[a-f0-9-]{36}\.(mp3|wav|flac|ogg|m4a|jpg|png|webp)$/.test(
    value,
  );
}

export function audioSourceUri(
  value: string,
  runtime?: Pick<FirebaseRuntime, "mode" | "backendUrl">,
): string | null {
  if (isLocalDemoAudio(value) || isLocalMedia(value)) {
    if (runtime?.mode !== "emulator" || !runtime.backendUrl) return null;
    return new URL(value, runtime.backendUrl).href;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}
