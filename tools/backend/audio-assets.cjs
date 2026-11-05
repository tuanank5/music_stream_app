const { createHash, randomUUID } = require("node:crypto");
const fail = (status, message) => Object.assign(new Error(message), { status });
function settings() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME,
    key = process.env.CLOUDINARY_API_KEY,
    secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret || !/^[A-Za-z0-9_-]+$/.test(cloud))
    throw fail(503, "Backend chưa cấu hình Cloudinary để xác minh audio.");
  return { cloud, key, secret };
}
function audioUploadConfig(uid) {
  const { cloud, key, secret } = settings();
  const publicId = `musicstream/${uid}/audio/${randomUUID()}`,
    timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${secret}`)
    .digest("hex");
  return { cloud, apiKey: key, publicId, timestamp, signature };
}
async function verifyAudio(uid, publicId, request = fetch) {
  const { cloud, key, secret } = settings();
  if (
    !publicId.startsWith(`musicstream/${uid}/audio/`) ||
    publicId.includes("..")
  )
    throw fail(403, "Audio không thuộc vùng tải lên của bạn.");
  let response;
  try {
    response = await request(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/video/upload/${encodeURIComponent(publicId)}?media_metadata=true`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );
  } catch {
    throw fail(503, "Không xác minh được audio. Hãy thử lại.");
  }
  if (!response.ok)
    throw fail(
      response.status === 404 ? 400 : 503,
      "Không xác minh được audio trên Cloudinary.",
    );
  const value = await response.json();
  if (
    value.public_id !== publicId ||
    value.resource_type !== "video" ||
    !Number.isFinite(value.duration) ||
    value.duration <= 0 ||
    !Number.isFinite(value.bytes) ||
    value.bytes <= 0 ||
    value.bytes > 30 * 1024 * 1024 ||
    !value.secure_url?.startsWith("https://") ||
    value.width > 0 ||
    value.height > 0
  )
    throw fail(400, "File audio hoặc metadata không hợp lệ.");
  return { url: value.secure_url, duration: value.duration };
}
module.exports = { audioUploadConfig, verifyAudio };
