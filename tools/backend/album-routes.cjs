const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { createRequestId } = require("./create-request.cjs");
const { imageUrl, localMediaPath } = require("./local-media.cjs");
const { prepareImage, stageImageChange } = require("./image-assets.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function validateAlbum(value, { uid, mode } = {}) {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).some(
      (key) => !["title", "description", "coverUrl", "isPublic"].includes(key),
    )
  )
    throw fail(400, "Thuộc tính album không hợp lệ.");
  const { title, description, coverUrl, isPublic } = value;
  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 150 ||
    typeof description !== "string" ||
    description.length > 4000 ||
    typeof coverUrl !== "string" ||
    coverUrl.length > 2048 ||
    typeof isPublic !== "boolean"
  )
    throw fail(400, "Tên, mô tả, ảnh hoặc trạng thái album không hợp lệ.");
  imageUrl(coverUrl, uid, mode);
  if (coverUrl && !localMediaPath(coverUrl)) {
    try {
      const url = new URL(coverUrl);
      if (url.protocol !== "https:" || url.username || url.password)
        throw Error();
    } catch {
      throw fail(400, "Ảnh album phải là URL HTTPS.");
    }
  }
  return {
    title: title.trim(),
    description: description.trim(),
    coverUrl,
    isPublic,
  };
}
function createAlbumRouter({ db, mode }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const json = express.json({ limit: "32kb" });
  const save = (creating) => async (req, res) => {
    const fields = validateAlbum(req.body, { uid: req.auth.uid, mode });
    const id = req.params.id;
    if (!creating && (!id || !/^[A-Za-z0-9_-]{1,128}$/.test(id)))
      throw fail(400, "ID album không hợp lệ.");
    const requestId = creating ? createRequestId(req, "albums") : undefined;
    const ref = creating
      ? requestId
        ? db.collection("albums").doc(requestId)
        : db.collection("albums").doc()
      : db.doc(`albums/${id}`);
    const prepared = await prepareImage(
      req.auth.uid,
      fields.coverUrl,
      mode,
      !creating && mode === "cloud"
        ? (await ref.get()).data()?.coverUrl
        : undefined,
    );
    const value = await db.runTransaction(async (tx) => {
      const profile = await tx.get(db.doc(`users/${req.auth.uid}`));
      if (!profile.exists || profile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (creating && requestId) {
        const existing = await tx.get(ref);
        if (existing.exists) {
          const value = existing.data();
          if (
            value.artistId !== req.auth.uid ||
            value.deleting ||
            Object.entries(fields).some(([key, field]) => value[key] !== field)
          )
            throw fail(
              409,
              "Yêu cầu đã được sử dụng cho album khác hoặc album đã thay đổi.",
            );
          return {
            id: ref.id,
            ...fields,
            artistId: req.auth.uid,
            artistName: profile.data().displayName || "",
          };
        }
      }
      let coverPublicId = null;
      let previous = {};
      if (!creating) {
        const album = await tx.get(ref);
        if (!album.exists) throw fail(404, "Không tìm thấy album.");
        if (album.data().artistId !== req.auth.uid)
          throw fail(403, "Bạn không sở hữu album này.");
        if (album.data().deleting) throw fail(409, "Album đang được xóa.");
        if (album.data().coverUrl === fields.coverUrl)
          coverPublicId = album.data().coverPublicId ?? null;
        previous = {
          url: album.data().coverUrl,
          publicId: album.data().coverPublicId,
        };
      }
      const change = await stageImageChange(
        tx,
        db,
        req.auth.uid,
        ref.path,
        prepared,
        previous,
      );
      coverPublicId = change.publicId;
      change.write();
      const changes = {
        ...fields,
        coverPublicId,
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (creating)
        tx.create(ref, {
          ...changes,
          artistId: req.auth.uid,
          createdAt: FieldValue.serverTimestamp(),
          releaseDate: FieldValue.serverTimestamp(),
        });
      else tx.update(ref, changes);
      return {
        id: ref.id,
        ...fields,
        artistId: req.auth.uid,
        artistName: profile.data().displayName || "",
      };
    });
    res.status(creating ? 201 : 200).json(value);
  };
  router.post("/albums", json, save(true));
  router.patch("/albums/:id", json, save(false));
  const changeSong = (add) => async (req, res) => {
    req.resume();
    const { id, songId } = req.params;
    if (![id, songId].every((value) => /^[A-Za-z0-9_-]{1,128}$/.test(value)))
      throw fail(400, "ID album hoặc bài hát không hợp lệ.");
    const albumRef = db.doc(`albums/${id}`),
      songRef = db.doc(`songs/${songId}`);
    await db.runTransaction(async (tx) => {
      const [profile, album, song] = await Promise.all([
        tx.get(db.doc(`users/${req.auth.uid}`)),
        tx.get(albumRef),
        tx.get(songRef),
      ]);
      if (!profile.exists || profile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (!album.exists || !song.exists)
        throw fail(404, "Album hoặc bài hát không tồn tại.");
      if (
        album.data().artistId !== req.auth.uid ||
        song.data().artistId !== req.auth.uid
      )
        throw fail(403, "Bạn không sở hữu album hoặc bài hát này.");
      const source = song.data(),
        current = source.albumId || "";
      if (add && album.data().deleting) throw fail(409, "Album đang được xóa.");
      if (add && source.active !== true)
        throw fail(409, "Bài hát không còn hoạt động.");
      if (current && current !== id)
        throw fail(409, "Bài hát đã thuộc album khác.");
      if ((add && current === id) || (!add && !current)) return;
      tx.update(songRef, {
        albumId: add ? id : null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    res.json({ songId, albumId: add ? id : null });
  };
  router.put("/albums/:id/songs/:songId", changeSong(true));
  router.delete("/albums/:id/songs/:songId", changeSong(false));
  router.delete("/albums/:id", async (req, res) => {
    req.resume();
    const { id } = req.params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw fail(400, "ID album không hợp lệ.");
    const ref = db.doc(`albums/${id}`);
    // Mark first so concurrent membership/create operations cannot add new references.
    await db.runTransaction(async (tx) => {
      const [profile, album] = await Promise.all([
        tx.get(db.doc(`users/${req.auth.uid}`)),
        tx.get(ref),
      ]);
      if (!profile.exists || profile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (!album.exists) return;
      if (album.data().artistId !== req.auth.uid)
        throw fail(403, "Bạn không sở hữu album này.");
      tx.update(ref, {
        deleting: true,
        isPublic: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    for (let batch = 0; batch < 50; batch++) {
      const finished = await db.runTransaction(async (tx) => {
        const [profile, album] = await Promise.all([
          tx.get(db.doc(`users/${req.auth.uid}`)),
          tx.get(ref),
        ]);
        if (!profile.exists || profile.data().active === false)
          throw fail(403, "Tài khoản không hoạt động.");
        if (!album.exists) return true;
        if (album.data().artistId !== req.auth.uid)
          throw fail(403, "Bạn không sở hữu album này.");
        const linked = await tx.get(
          db.collection("songs").where("albumId", "==", id).limit(100),
        );
        if (linked.docs.some((song) => song.data().artistId !== req.auth.uid))
          throw fail(
            409,
            "Album có liên kết dữ liệu không hợp lệ. Vui lòng thử lại sau.",
          );
        if (linked.empty) {
          const change = await stageImageChange(
            tx,
            db,
            req.auth.uid,
            ref.path,
            { url: "", publicId: null },
            {
              url: album.data().coverUrl,
              publicId: album.data().coverPublicId,
            },
          );
          change.write();
          tx.delete(ref);
          return true;
        }
        for (const song of linked.docs)
          tx.update(song.ref, {
            albumId: null,
            updatedAt: FieldValue.serverTimestamp(),
          });
        return false;
      });
      if (finished) return res.json({ id, deleted: true });
    }
    throw fail(503, "Album có nhiều bài. Vui lòng thử xóa lại để tiếp tục.");
  });
  return router;
}
module.exports = { createAlbumRouter, validateAlbum };
