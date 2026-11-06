import type { PickedMedia } from "./mediaUploadService";

// Decode and re-encode the actual image; changing a filename/MIME alone cannot
// make formats such as HEIC/AVIF readable by the upload server or other devices.
export async function prepareImageUpload(
  asset: PickedMedia,
): Promise<PickedMedia> {
  const { ImageManipulator, SaveFormat } =
    await import("expo-image-manipulator");
  const context = ImageManipulator.manipulate(asset.uri);
  let image;
  let outputUri: string | undefined;
  try {
    image = await context.renderAsync();
    if (Math.max(image.width, image.height) > 1600) {
      context.resize(
        image.width >= image.height ? { width: 1600 } : { height: 1600 },
      );
      image.release();
      image = undefined;
      image = await context.renderAsync();
    }
    const result = await image.saveAsync({
      format: SaveFormat.PNG,
      base64: true,
    });
    outputUri = result.uri;
    if (!result.base64) throw new Error("Missing encoded image");
    const padding = result.base64.endsWith("==")
      ? 2
      : result.base64.endsWith("=")
        ? 1
        : 0;
    const size = Math.floor((result.base64.length * 3) / 4) - padding;
    if (size > 5 * 1024 * 1024)
      throw new Error("Ảnh sau chuyển đổi vượt 5 MB. Hãy chọn ảnh nhỏ hơn.");
    return {
      uri: result.uri.startsWith("blob:")
        ? `data:image/png;base64,${result.base64}`
        : result.uri,
      name: `${asset.name.replace(/\.[^.]*$/, "") || "image"}.png`,
      mimeType: "image/png",
      size,
      // The original File and size belong to the unconverted image.
      // On web uploadMedia reads the newly encoded URI instead.
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("vượt 5 MB"))
      throw error;
    throw new Error(
      "Không đọc hoặc chuyển đổi được ảnh này trên thiết bị. Hãy xuất ảnh sang JPG/PNG rồi chọn lại.",
    );
  } finally {
    if (outputUri?.startsWith("blob:")) URL.revokeObjectURL(outputUri);
    image?.release();
    context.release();
  }
}
