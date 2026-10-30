import { Platform } from "react-native";

export type PickedMedia = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  file?: File;
};

export async function uploadMedia(
  asset: PickedMedia,
  kind: "image" | "video",
) {
  const cloud =
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

  const preset =
    kind === "image"
      ? process.env.EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET
      : process.env.EXPO_PUBLIC_CLOUDINARY_AUDIO_PRESET;

  if (!cloud || !preset) {
    throw new Error(
      "Chưa cấu hình Cloudinary cloud name / upload preset.",
    );
  }

  const max =
    kind === "image"
      ? 5 * 1024 * 1024
      : 30 * 1024 * 1024;

  if (asset.size && asset.size > max) {
    throw new Error(
      kind === "image"
        ? "Ảnh tối đa 5 MB."
        : "Nhạc tối đa 30 MB.",
    );
  }

  const form = new FormData();

  if (Platform.OS === "web") {
    const blob =
      asset.file ??
      await (await fetch(asset.uri)).blob();

    if (blob.size > max) {
      throw new Error(
        "File vượt giới hạn dung lượng.",
      );
    }

    form.append("file", blob, asset.name);
  } else {
    form.append("file", {
      uri: asset.uri,
      name: asset.name,
      type: asset.mimeType,
    } as unknown as Blob);
  }

  form.append("upload_preset", preset);

  const abort = new AbortController();

  const timer = setTimeout(
    () => abort.abort(),
    120000,
  );

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloud}/${kind}/upload`,
      {
        method: "POST",
        body: form,
        signal: abort.signal,
      },
    );

    const value = await response.json();

    if (!response.ok || !value.secure_url) {
      throw new Error(
        value.error?.message ||
          "Không tải được file lên Cloudinary.",
      );
    }

    return {
      url: String(value.secure_url),
      duration: Number(value.duration ?? 0),
    };
  } finally {
    clearTimeout(timer);
  }
}