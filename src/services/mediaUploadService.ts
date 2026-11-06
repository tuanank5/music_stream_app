import { Platform } from "react-native";
import { getFirebaseRuntime } from "./firebase/config";
import { assertExternalUploadsAllowed } from "./firebase/runtime";
import { backendGet } from "./backendService";
import { getFirebaseAuth } from "./firebase";
import { prepareImageUpload } from "./prepareImageUpload";

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
  const user = getFirebaseAuth().currentUser;
  if (!user || !runtime.backendUrl)
    throw new Error("Cần đăng nhập và cấu hình backend.");
  const token = local ? await user.getIdToken() : null;
  if (getFirebaseAuth().currentUser !== user)
    throw new Error("Phiên đăng nhập đã thay đổi.");
  const signed = !local
    ? await backendGet<{
        cloud: string;
        apiKey: string;
        publicId: string;
        timestamp: number;
        signature: string;
        overwrite?: string;
        allowedFormats?: string;
      }>(kind === "image" ? "/image-upload-config" : "/audio-upload-config")
    : null;
  const cloud = signed?.cloud;

  const max = kind === "image" ? 5 * 1024 * 1024 : 30 * 1024 * 1024;

  if (asset.size && asset.size > max) {
    throw new Error(
      kind === "image" ? "Ảnh tối đa 5 MB." : "Nhạc tối đa 30 MB.",
    );
  }

  const prepared = kind === "image" ? await prepareImageUpload(asset) : asset;
  if (getFirebaseAuth().currentUser !== user)
    throw new Error("Phiên đăng nhập đã thay đổi.");
  const form = new FormData();

  if (Platform.OS === "web") {
    const blob = prepared.file ?? (await (await fetch(prepared.uri)).blob());

    if (blob.size > max) {
      throw new Error("File vượt giới hạn dung lượng.");
    }

    form.append("file", blob, prepared.name);
  } else {
    // SDK 58's global fetch encodes Blob/File parts, not RN's legacy URI object.
    const { File } = await import("expo-file-system");
    const file = new File(prepared.uri);
    if (file.size > max) throw new Error("File vượt giới hạn dung lượng.");
    form.append("file", file);
  }

  if (signed) {
    form.append("api_key", signed.apiKey);
    form.append("timestamp", String(signed.timestamp));
    form.append("signature", signed.signature);
    form.append("public_id", signed.publicId);
    if (signed.overwrite) form.append("overwrite", signed.overwrite);
    if (signed.allowedFormats)
      form.append("allowed_formats", signed.allowedFormats);
  }

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

    if (getFirebaseAuth().currentUser !== user)
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
