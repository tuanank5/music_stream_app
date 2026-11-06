const { FieldValue } = require("firebase-admin/firestore");
const { validateGenres } = require("../../src/utils/genres.ts");
const { imageUrl, localMediaPath, ownedMedia } = require("./local-media.cjs");
const { prepareImage, stageImageChange } = require("./image-assets.cjs");
const { runTransaction } = require("./transaction.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function validateSongInput(value, { uid, mode } = {}) {
  if (
    !value ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) =>
        ![
          "requestId",
          "title",
          "artistNames",
          "genre",
          "lyric",
          "description",
          "isPublic",
          "albumId",
          "coverUrl",
          "audioPublicId",
        ].includes(key),
    )
  )
    throw fail(400, "Thuộc tính bài hát không hợp lệ.");
  const text = (key, max, required = false) => {
    if (
      typeof value[key] !== "string" ||
      value[key].length > max ||
      (required && !value[key].trim())
    )
      throw fail(400, `Thông tin ${key} không hợp lệ.`);
    return value[key].trim();
  };
  const requestId = text("requestId", 128, true),
    albumId = value.albumId === null ? null : text("albumId", 128);
  if (
    !/^[A-Za-z0-9_-]{20,128}$/.test(requestId) ||
    (albumId && !/^[A-Za-z0-9_-]{1,128}$/.test(albumId))
  )
    throw fail(400, "ID không hợp lệ.");
  if (
    !Array.isArray(value.artistNames) ||
    !value.artistNames.length ||
    value.artistNames.length > 10 ||
    value.artistNames.some(
      (name) => typeof name !== "string" || !name.trim() || name.length > 80,
    )
  )
    throw fail(400, "Tên nghệ sĩ không hợp lệ.");
  if (typeof value.isPublic !== "boolean" || !Array.isArray(value.genre))
    throw fail(400, "Quyền hoặc thể loại không hợp lệ.");
  let genre;
  try {
    genre = validateGenres(value.genre);
  } catch {
    throw fail(400, "Chọn 1–10 thể loại hợp lệ.");
  }
  const coverUrl = text("coverUrl", 2048);
  imageUrl(coverUrl, uid, mode);
  if (coverUrl && !localMediaPath(coverUrl)) {
    try {
      const url = new URL(coverUrl);
      if (url.protocol !== "https:" || url.username || url.password)
        throw Error();
    } catch {
      throw fail(400, "Ảnh bìa phải là HTTPS.");
    }
  }
  return {
    requestId,
    title: text("title", 150, true),
    artistNames: value.artistNames.map((name) => name.trim()),
    albumId: albumId || null,
    coverUrl,
    genre,
    lyric: text("lyric", 12000),
    description: text("description", 4000),
    isPublic: value.isPublic,
    audioPublicId: text("audioPublicId", 512, true),
  };
}
async function createOwnedSong(db, uid, input, audio, { local = false } = {}) {
  const localAudio =
    local &&
    db.projectId.startsWith("demo-") &&
    localMediaPath(audio.url) &&
    ownedMedia(uid, audio.url, "audio");
  if (
    !Number.isFinite(audio.duration) ||
    audio.duration <= 0 ||
    audio.duration > 10800 ||
    (!audio.url?.startsWith("https://") && !localAudio)
  )
    throw fail(400, "Metadata audio không hợp lệ.");
  const ref = db.doc(`songs/${input.requestId}`),
    userRef = db.doc(`users/${uid}`);
  const prepared = await prepareImage(
    uid,
    input.coverUrl,
    local ? "emulator" : "cloud",
  );
  return runTransaction(db, async (tx) => {
    const [user, existing] = await tx.getAll(userRef, ref);
    if (!user.exists || user.data().active === false)
      throw fail(403, "Tài khoản không hoạt động.");
    if (existing.exists) {
      const { requestId, ...requested } = input;
      if (
        existing.data().artistId !== uid ||
        Object.entries(requested).some(
          ([key, value]) =>
            JSON.stringify(existing.data()[key]) !== JSON.stringify(value),
        )
      )
        throw fail(409, "ID yêu cầu đã được sử dụng.");
      return { id: ref.id, reused: true };
    }
    if (input.albumId) {
      const album = await tx.get(db.doc(`albums/${input.albumId}`));
      if (
        !album.exists ||
        album.data().artistId !== uid ||
        album.data().deleting
      )
        throw fail(409, "Album không khả dụng hoặc không thuộc bạn.");
    }
    const uploads = await tx.get(
      db
        .collection("songs")
        .where("artistId", "==", uid)
        .where("active", "==", true),
    );
    const used = uploads.docs.reduce((sum, song) => {
      const duration = song.data().durationSeconds;
      if (!Number.isFinite(duration) || duration <= 0)
        throw fail(
          409,
          "Dữ liệu thời lượng cũ cần được kiểm tra trước khi tải thêm.",
        );
      return sum + duration;
    }, 0);
    if (!Number.isFinite(used) || used + audio.duration > 10800)
      throw fail(409, "Bạn đã dùng hết hạn mức tải lên 180 phút.");
    const { requestId, ...fields } = input;
    const imageChange = await stageImageChange(tx, db, uid, ref.path, prepared);
    imageChange.write();
    tx.create(ref, {
      ...fields,
      artistId: uid,
      coverPublicId: imageChange.publicId,
      audioUrl: audio.url,
      durationSeconds: audio.duration,
      active: true,
      playCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      releaseDate: FieldValue.serverTimestamp(),
    });
    // Shared document lock serializes concurrent creates, including an initially empty catalog.
    tx.update(userRef, { updatedAt: FieldValue.serverTimestamp() });
    return { id: ref.id, reused: false };
  });
}
module.exports = { createOwnedSong, validateSongInput };
