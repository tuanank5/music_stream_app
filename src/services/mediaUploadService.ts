import { Platform } from "react-native";
import { getFirebaseRuntime } from "./firebase/config";
import { assertExternalUploadsAllowed } from "./firebase/runtime";
import { backendGet } from "./backendService";
import { getFirebaseAuth } from "./firebase";

export type PickedMedia = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  file?: File;
};

export async function uploadMedia(asset: PickedMedia, kind: "image" | "video") {
  const runtime = getFirebaseRuntime();
  const local = runtime.mode === "emulator";
  if (!local) assertExternalUploadsAllowed(runtime);
  if (local && !asset.file && /^https?:/i.test(asset.uri))
    throw new Error(
      "File local phải được chọn từ thiết bị, không phải URL bên ngoài.",
    );
  const user = local ? getFirebaseAuth().currentUser : null;
  if (local && (!user || !runtime.backendUrl))
    throw new Error("Cần đăng nhập và cấu hình backend local.");
  const token = user ? await user.getIdToken() : null;
  if (local && getFirebaseAuth().currentUser !== user)
    throw new Error("Phiên đăng nhập đã thay đổi.");
  const signed =
    !local && kind === "video"
      ? await backendGet<{
          cloud: string;
          apiKey: string;
          publicId: string;
          timestamp: number;
          signature: string;
        }>("/audio-upload-config")
      : null;
  const cloud = signed?.cloud || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const preset =
    kind === "image"
      ? process.env.EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET
      : process.env.EXPO_PUBLIC_CLOUDINARY_AUDIO_PRESET;

  if (!local && (!cloud || (!signed && !preset))) {
    throw new Error("Chưa cấu hình Cloudinary cloud name / upload preset.");
  }

  const max = kind === "image" ? 5 * 1024 * 1024 : 30 * 1024 * 1024;

  if (asset.size && asset.size > max) {
    throw new Error(
      kind === "image" ? "Ảnh tối đa 5 MB." : "Nhạc tối đa 30 MB.",
    );
  }

  const form = new FormData();

  if (Platform.OS === "web") {
    const blob = asset.file ?? (await (await fetch(asset.uri)).blob());

    if (blob.size > max) {
      throw new Error("File vượt giới hạn dung lượng.");
    }

    form.append("file", blob, asset.name);
  } else {
    form.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType,
    } as unknown as Blob);
  }

  if (signed) {
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("public_id", signed.publicId);
  } else if (!local) form.append("upload_preset", preset!);

  const abort = new AbortController();

  const timer = setTimeout(() => abort.abort(), 120000);

  try {
    const response = await fetch(
      local
        ? `${runtime.backendUrl}/local-media/upload/${kind === "video" ? "audio" : "image"}`
        : `https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`,
      {
        method: "POST",
        body: form,
        signal: abort.signal,
        ...(local ? { headers: { Authorization: `Bearer ${token}` } } : {}),
      },
    );

    const value = await response.json();

    if (!response.ok || !(local ? value.url : value.secure_url)) {
      throw new Error(
        (typeof value.error === "string"
          ? value.error
          : value.error?.message) || "Không tải được file.",
      );
    }

    if (local && getFirebaseAuth().currentUser !== user)
      throw new Error("Phiên đăng nhập đã thay đổi.");
    return {
      url: String(local ? value.url : value.secure_url),
      duration: Number(value.duration ?? 0),
      publicId: String(local ? value.publicId : value.public_id || ""),
    };
  } finally {
    clearTimeout(timer);
  }
}
