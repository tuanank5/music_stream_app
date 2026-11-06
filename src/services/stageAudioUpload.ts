import type { PickedMedia } from "./mediaUploadService";

export async function stageAudioUpload(asset: PickedMedia, maxBytes: number) {
  const { File, Paths } = await import("expo-file-system");
  const name =
    asset.name.replace(/[^\p{L}\p{N}._-]/gu, "_").slice(-100) || "audio";
  const file = new File(
    Paths.cache,
    `upload-${Date.now()}-${Math.random().toString(36).slice(2)}-${name}`,
  );
  const cleanup = () => {
    try {
      if (file.exists) file.delete();
    } catch {
      console.warn("Không dọn được file audio upload tạm.");
    }
  };
  try {
    // Android DocumentPicker's shared cache can be outside an Expo Go sandbox.
    // Copy only through the system-granted content URI into this app's cache.
    await new File(asset.uri).copy(file);
    if (file.size > maxBytes) throw new Error("File vượt giới hạn dung lượng.");
    return { file, cleanup };
  } catch (error) {
    cleanup();
    if (error instanceof Error && error.message.includes("vượt giới hạn"))
      throw error;
    throw new Error(
      "Không đọc được file âm thanh đã chọn. Hãy chọn lại file từ trình chọn tài liệu trên thiết bị.",
    );
  }
}
