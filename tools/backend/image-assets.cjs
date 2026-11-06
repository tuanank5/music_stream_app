const { createHash, randomUUID } = require("node:crypto");
const { Timestamp, FieldValue } = require("firebase-admin/firestore");
const fail = (status, message) => Object.assign(new Error(message), { status });
const GRACE_MS = 24 * 60 * 60 * 1000;
function settings() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME,
    key = process.env.CLOUDINARY_API_KEY,
    secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret || !/^[\w-]+$/.test(cloud))
    throw fail(503, "Backend chưa cấu hình Cloudinary cho ảnh.");
  return { cloud, key, secret };
}
function signature(params, secret) {
  return createHash("sha1")
    .update(
      Object.keys(params)
        .sort()
        .map((key) => `${key}=${params[key]}`)
        .join("&") + secret,
    )
    .digest("hex");
}
function assetRef(db, publicId) {
  return db
    .collection("imageAssets")
    .doc(createHash("sha256").update(publicId).digest("hex"));
}
function ownedId(uid, publicId) {
  return (
    typeof publicId === "string" &&
    publicId.startsWith(`musicstream/${uid}/image/`) &&
    /^[a-f0-9-]{36}$/.test(publicId.slice(`musicstream/${uid}/image/`.length))
  );
}
async function imageUploadConfig(db, uid) {
  const { cloud, key, secret } = settings();
  const publicId = `musicstream/${uid}/image/${randomUUID()}`;
  const params = {
    allowed_formats: "png,jpg,webp",
    overwrite: "false",
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };
  // Persist before returning a signature, including abandoned/failed uploads.
  await assetRef(db, publicId).create({
    ownerId: uid,
    publicId,
    cloud,
    state: "pending",
    refs: [],
    createdAt: Timestamp.now(),
    deleteAfter: Timestamp.fromMillis(Date.now() + GRACE_MS),
  });
  return {
    cloud,
    apiKey: key,
    publicId,
    timestamp: params.timestamp,
    signature: signature(params, secret),
    overwrite: params.overwrite,
    allowedFormats: params.allowed_formats,
  };
}
function publicIdFromUrl(uid, value) {
  const { cloud } = settings();
  let url;
  try {
    url = new URL(value);
  } catch {
    throw fail(400, "URL ảnh không hợp lệ.");
  }
  const prefix = `/${cloud}/image/upload/`;
  if (
    url.origin !== "https://res.cloudinary.com" ||
    !url.pathname.startsWith(prefix) ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  )
    throw fail(400, "Ảnh mới phải được tải lên bằng backend.");
  const tail = url.pathname.slice(prefix.length).replace(/^v\d+\//, "");
  const match =
    /^(musicstream\/[^/]+\/image\/[a-f0-9-]{36})\.(png|jpg|webp)$/.exec(tail);
  if (!match || !ownedId(uid, match[1]))
    throw fail(403, "Ảnh không thuộc vùng tải lên của bạn.");
  return match[1];
}
async function verifyImage(uid, url, request = fetch) {
  if (!url) return { url: "", publicId: null };
  const publicId = publicIdFromUrl(uid, url);
  const { cloud, key, secret } = settings();
  let response, value;
  try {
    response = await request(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${encodeURIComponent(publicId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (response.ok) value = await response.json();
  } catch {
    throw fail(503, "Không xác minh được ảnh. Hãy thử lại.");
  }
  if (!response.ok)
    throw fail(
      response.status === 404 ? 400 : 503,
      "Không xác minh được ảnh trên Cloudinary.",
    );
  if (
    value.public_id !== publicId ||
    value.resource_type !== "image" ||
    value.type !== "upload" ||
    !["png", "jpg", "webp"].includes(value.format) ||
    !Number.isFinite(value.bytes) ||
    value.bytes <= 0 ||
    value.bytes > 5 * 1024 * 1024 ||
    !Number.isSafeInteger(value.width) ||
    value.width < 1 ||
    value.width > 4096 ||
    !Number.isSafeInteger(value.height) ||
    value.height < 1 ||
    value.height > 4096 ||
    value.pages > 1 ||
    value.secure_url !== url
  )
    throw fail(400, "Ảnh hoặc metadata không hợp lệ (tối đa 5 MB, ảnh tĩnh).");
  return { url: value.secure_url, publicId };
}
async function prepareImage(uid, url, mode, previousUrl, request) {
  if (mode !== "cloud" || url === previousUrl)
    return { url, unchanged: true, cloud: mode === "cloud" };
  return verifyImage(uid, url, request);
}
// Read all ledgers before any transaction write. The caller invokes write()
// only after its own remaining reads, so binding and deletion claims conflict.
async function stageImageChange(tx, db, uid, target, prepared, previous = {}) {
  const { url, publicId, unchanged } = prepared;
  if (unchanged) {
    if (prepared.cloud && url !== previous.url)
      throw fail(409, "Ảnh đã thay đổi, hãy tải lại.");
    return {
      publicId: url === previous.url ? (previous.publicId ?? null) : null,
      write() {},
    };
  }
  const nextRef = publicId ? assetRef(db, publicId) : null;
  const oldRef =
    previous.publicId && previous.publicId !== publicId
      ? assetRef(db, previous.publicId)
      : null;
  const next = nextRef ? await tx.get(nextRef) : null;
  const old = oldRef ? await tx.get(oldRef) : null;
  if (nextRef) {
    const value = next.data();
    if (
      !next.exists ||
      value.ownerId !== uid ||
      value.cloud !== settings().cloud ||
      !ownedId(uid, publicId) ||
      !["pending", "attached"].includes(value.state) ||
      (value.state === "pending" && value.deleteAfter.toMillis() <= Date.now())
    )
      throw fail(
        409,
        "Ảnh hết hạn hoặc không có phiên tải lên hợp lệ. Hãy tải ảnh lại.",
      );
    if (!value.refs.includes(target) && value.refs.length >= 200)
      throw fail(409, "Ảnh có quá nhiều liên kết.");
  }
  return {
    publicId,
    write() {
      if (nextRef)
        tx.update(nextRef, {
          state: "attached",
          refs: [...new Set([...next.data().refs, target])],
          url,
          deleteAfter: FieldValue.delete(),
          updatedAt: Timestamp.now(),
        });
      if (
        old?.exists &&
        old.data().ownerId === uid &&
        !["deleting", "deleted"].includes(old.data().state)
      ) {
        const refs = old.data().refs.filter((ref) => ref !== target);
        tx.update(oldRef, {
          refs,
          ...(refs.length
            ? {}
            : {
                state: "pending",
                deleteAfter: Timestamp.fromMillis(Date.now() + GRACE_MS),
              }),
          updatedAt: Timestamp.now(),
        });
      }
    },
  };
}
async function destroyImage(publicId, request = fetch) {
  const { cloud, key, secret } = settings();
  const params = {
    invalidate: "true",
    public_id: publicId,
    timestamp: Math.floor(Date.now() / 1000),
  };
  const body = new URLSearchParams({
    ...params,
    api_key: key,
    signature: signature(params, secret),
  });
  const response = await request(
    `https://api.cloudinary.com/v1_1/${cloud}/image/destroy`,
    { method: "POST", body, signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw fail(503, "Cloudinary chưa xóa được ảnh.");
  const result = await response.json();
  if (!["ok", "not found"].includes(result.result))
    throw fail(503, "Cloudinary chưa xác nhận xóa ảnh.");
}
async function cleanImages(
  db,
  { apply = false, now = Date.now(), request = fetch, limit = 50 } = {},
) {
  const { cloud } = settings();
  const due = await db
    .collection("imageAssets")
    .where("deleteAfter", "<=", Timestamp.fromMillis(now))
    .limit(limit)
    .get();
  const results = [];
  for (const row of due.docs) {
    const hint = row.data();
    if (
      hint.cloud !== cloud ||
      !ownedId(hint.ownerId, hint.publicId) ||
      hint.refs.length ||
      !["pending", "deleting"].includes(hint.state)
    )
      continue;
    // A legacy importer may have saved only the URL, even for a pending ticket.
    // Resolve the canonical URL before querying references; fail closed on API errors.
    const { key, secret } = settings();
    const response = await request(
      `https://api.cloudinary.com/v1_1/${cloud}/resources/image/upload/${encodeURIComponent(hint.publicId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok && response.status !== 404)
      throw fail(503, "Không kiểm tra được ảnh trước khi dọn.");
    const metadata = response.ok ? await response.json() : null;
    if (
      metadata &&
      (metadata.public_id !== hint.publicId ||
        publicIdFromUrl(hint.ownerId, metadata.secure_url) !== hint.publicId)
    )
      throw fail(503, "Metadata ảnh không khớp khi dọn.");
    const canonicalUrl = metadata?.secure_url || hint.url;
    const candidate = await db.runTransaction(async (tx) => {
      const snap = await tx.get(row.ref);
      const value = snap.data();
      if (
        !value ||
        value.publicId !== hint.publicId ||
        value.ownerId !== hint.ownerId ||
        value.cloud !== cloud ||
        !ownedId(value.ownerId, value.publicId) ||
        value.refs.length ||
        !["pending", "deleting"].includes(value.state) ||
        value.deleteAfter.toMillis() > now
      )
        return null;
      // Defense in depth for legacy/imported data missing ledger references.
      for (const [name, field] of [
        ["users", "avatarPublicId"],
        ["songs", "coverPublicId"],
        ["albums", "coverPublicId"],
      ]) {
        if (
          !(
            await tx.get(
              db.collection(name).where(field, "==", value.publicId).limit(1),
            )
          ).empty
        )
          return null;
        if (
          canonicalUrl &&
          !(
            await tx.get(
              db
                .collection(name)
                .where(
                  field === "avatarPublicId" ? "avatarUrl" : "coverUrl",
                  "==",
                  canonicalUrl,
                )
                .limit(1),
            )
          ).empty
        )
          return null;
      }
      if (apply)
        tx.update(row.ref, { state: "deleting", updatedAt: Timestamp.now() });
      return value;
    });
    if (!candidate) continue;
    if (apply) {
      // Keep the deleting tombstone on failure; retries are safe and binding is blocked.
      await destroyImage(candidate.publicId, request);
      await row.ref.update({
        state: "deleted",
        deleteAfter: FieldValue.delete(),
        updatedAt: Timestamp.now(),
      });
    }
    results.push({
      publicId: candidate.publicId,
      action: apply ? "deleted" : "would-delete",
    });
  }
  return results;
}
module.exports = {
  imageUploadConfig,
  verifyImage,
  prepareImage,
  stageImageChange,
  cleanImages,
  assetRef,
  GRACE_MS,
  signature,
};
