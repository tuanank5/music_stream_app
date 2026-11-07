const fail = (status, message) => Object.assign(new Error(message), { status });
const MAX_BYTES = 30 * 1024 * 1024;
let active = 0;

// Called only for ambiguous Cloudinary metadata, after ownership/URL validation.
async function inspectAudio(url, expectedBytes, request = fetch) {
  if (active >= 2) throw fail(429, "Đang xác minh audio khác. Hãy thử lại.");
  active++;
  try {
    let bytes;
    try {
      const response = await request(url, {
        redirect: "error",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok || !response.body)
        throw fail(503, "Không đọc được audio trên Cloudinary. Hãy thử lại.");
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      try {
        if (Number(response.headers.get("content-length")) > MAX_BYTES)
          throw fail(400, "Audio tối đa 30 MB.");
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > MAX_BYTES) throw fail(400, "Audio tối đa 30 MB.");
          chunks.push(Buffer.from(value));
        }
        if (size !== expectedBytes)
          throw fail(503, "File audio đã thay đổi. Hãy thử lưu lại.");
        bytes = Buffer.concat(chunks, size);
      } finally {
        await reader.cancel().catch(() => {});
      }
    } catch (error) {
      if (error.status) throw error;
      throw fail(503, "Không đọc được audio trên Cloudinary. Hãy thử lại.");
    }
    try {
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(bytes);
      if (
        !detected ||
        // ISO BMFF audio can use a generic isom/mp42 brand. file-type then
        // reports mp4/video MIME even when there are only AAC/ALAC audio tracks.
        // Admit the container here, and reject actual video after parsing below.
        !["mp3", "wav", "flac", "ogg", "m4a", "mp4"].includes(detected.ext)
      )
        throw Error("Unsupported audio format");
      const { parseBuffer, TrackType } = await import("music-metadata");
      const { format } = await parseBuffer(
        bytes,
        { mimeType: detected.mime, size: bytes.length },
        { duration: true, skipCovers: true },
      );
      if (
        format.hasVideo ||
        format.hasAudio === false ||
        format.trackInfo?.some((track) => track.type === TrackType.video) ||
        !(format.sampleRate > 0) ||
        !(format.numberOfChannels > 0) ||
        !Number.isFinite(format.duration) ||
        format.duration <= 0 ||
        format.duration > 10800
      )
        throw Error("Not an audio-only file");
      return format.duration;
    } catch {
      throw fail(
        400,
        "Không đọc được audio hợp lệ hoặc file chứa video (MP3/WAV/FLAC/OGG/M4A, tối đa 180 phút).",
      );
    }
  } finally {
    active--;
  }
}
module.exports = { inspectAudio };
