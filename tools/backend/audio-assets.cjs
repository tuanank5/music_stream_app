const { createHash, randomUUID } = require("node:crypto");
const { inspectAudio } = require("./inspect-audio.cjs");
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
  let response, value;
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
    if (response.ok) value = await response.json();
  } catch {
    throw fail(503, "Không xác minh được audio. Hãy thử lại.");
  }
  if (!response.ok)
    throw fail(
      response.status === 404 ? 400 : 503,
      "Không xác minh được audio trên Cloudinary.",
    );
  if (
    !value ||
    value.public_id !== publicId ||
    value.resource_type !== "video" ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes <= 0 ||
    value.bytes > 30 * 1024 * 1024 ||
    typeof value.secure_url !== "string"
  )
    throw fail(400, "File audio hoặc metadata không hợp lệ.");
  // Only read the exact owned asset from the configured CDN. Never follow a
  // redirect or download an arbitrary URL returned in unexpected metadata.
  try {
    const url = new URL(value.secure_url);
    const prefix = `/${cloud}/video/upload/`;
    const path = decodeURIComponent(url.pathname);
    const tail = path.slice(prefix.length).replace(/^v\d+\//, "");
    if (
      url.origin !== "https://res.cloudinary.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !path.startsWith(prefix) ||
      !tail.startsWith(`${publicId}.`) ||
      !/^[a-z0-9]+$/i.test(tail.slice(publicId.length + 1))
    )
      throw Error();
  } catch {
    throw fail(400, "Đường dẫn audio Cloudinary không hợp lệ.");
  }
  let duration = value.duration;
  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 10800 ||
    value.width > 0 ||
    value.height > 0 ||
    value.video?.codec ||
    value.has_video === true ||
    value.has_audio === false
  ) {
    // MP3 artwork can have dimensions; missing media details must not be
    // replaced by client-supplied duration or mistaken for a video stream.
    duration = await inspectAudio(value.secure_url, value.bytes, request);
  }
  return { url: value.secure_url, duration };
}
module.exports = { audioUploadConfig, verifyAudio };
