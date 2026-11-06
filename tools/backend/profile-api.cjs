const { FieldValue } = require("firebase-admin/firestore");
const { imageUrl, localMediaPath } = require("./local-media.cjs");
const { prepareImage, stageImageChange } = require("./image-assets.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
async function readProfileBody(request, { uid, mode } = {}) {
  if (
    !String(request.headers["content-type"] || "").startsWith(
      "application/json",
    )
  )
    throw fail(415, "Yêu cầu dữ liệu JSON.");
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 32768) throw fail(413, "Dữ liệu quá lớn.");
    chunks.push(chunk);
  }
  let value;
  try {
    value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw fail(400, "JSON không hợp lệ.");
  }
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) => !["displayName", "avatarUrl", "biography"].includes(key),
    )
  )
    throw fail(400, "Thuộc tính hồ sơ không hợp lệ.");
  const { displayName, avatarUrl, biography } = value;
  if (
    typeof displayName !== "string" ||
    !displayName.trim() ||
    displayName.trim().length > 80 ||
    typeof biography !== "string" ||
    biography.length > 4000 ||
    typeof avatarUrl !== "string" ||
    avatarUrl.length > 2048
  )
    throw fail(400, "Tên, ảnh hoặc tiểu sử không hợp lệ.");
  imageUrl(avatarUrl, uid, mode);
  if (avatarUrl && !localMediaPath(avatarUrl)) {
    try {
      const url = new URL(avatarUrl);
      if (url.protocol !== "https:" || url.username || url.password)
        throw Error();
    } catch {
      throw fail(400, "Ảnh đại diện phải là URL HTTPS.");
    }
  }
  return {
    displayName: displayName.trim(),
    avatarUrl,
    biography: biography.trim(),
  };
}
async function ownProfile(db, uid, fields, mode = "emulator") {
  const ref = db.doc(`users/${uid}`);
  const prepared = fields
    ? await prepareImage(
        uid,
        fields.avatarUrl,
        mode,
        mode === "cloud" ? (await ref.get()).data()?.avatarUrl : undefined,
      )
    : null;
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw fail(404, "Không tìm thấy hồ sơ.");
    const source = snapshot.data();
    if (source.active === false)
      throw fail(403, "Tài khoản của bạn đã bị vô hiệu hóa.");
    if (fields) {
      const change = await stageImageChange(tx, db, uid, ref.path, prepared, {
        url: source.avatarUrl,
        publicId: source.avatarPublicId,
      });
      change.write();
      tx.update(ref, {
        ...fields,
        avatarPublicId: change.publicId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    const value = { ...source, ...fields };
    return {
      userId: uid,
      email: String(source.email || ""),
      displayName: String(value.displayName || ""),
      avatarUrl: String(value.avatarUrl || ""),
      biography: String(value.biography || ""),
      followerCount: Number(value.followerCount) || 0,
      followingCount: Number(value.followingCount) || 0,
    };
  });
}
async function deactivateAccount(db, auth, uid) {
  const ref = db.doc(`users/${uid}`);
  const profile = await ref.get();
  if (!profile.exists) throw fail(404, "Không tìm thấy hồ sơ.");
  // Block API access first; retries can finish disabling Auth after partial failure.
  await ref.update({ active: false, updatedAt: FieldValue.serverTimestamp() });
  await auth.updateUser(uid, { disabled: true });
  await auth.revokeRefreshTokens(uid);
  return { active: false };
}
module.exports = { readProfileBody, ownProfile, deactivateAccount };
