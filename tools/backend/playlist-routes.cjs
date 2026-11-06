const express = require("express");
const { registerPlaylistReads } = require("./playlist-read.cjs");
const { FieldValue } = require("firebase-admin/firestore");
const { createRequestId } = require("./create-request.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createPlaylistRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  registerPlaylistReads(router, db);
  const json = express.json({ limit: "32kb" });
  const path = (uid, id) => db.doc(`users/${uid}/playlists/${id}`);
  const validId = (id) => {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw fail(400, "ID không hợp lệ.");
  };
  const mutate = (operation) => async (req, res) => {
    const uid = req.auth.uid,
      id = req.params.id;
    if (id) validId(id);
    if (req.params.songId) validId(req.params.songId);
    let fields;
    if (operation === "create" || operation === "edit") {
      const value = req.body;
      if (
        !value ||
        Array.isArray(value) ||
        Object.keys(value).some(
          (key) => !["name", "description", "isPublic"].includes(key),
        ) ||
        typeof value.name !== "string" ||
        !value.name.trim() ||
        value.name.trim().length > 80 ||
        typeof value.description !== "string" ||
        value.description.length > 500 ||
        typeof value.isPublic !== "boolean"
      )
        throw fail(400, "Tên, mô tả hoặc trạng thái playlist không hợp lệ.");
      fields = {
        name: value.name.trim(),
        description: value.description.trim(),
        isPublic: value.isPublic,
      };
    } else req.resume();
    const requestId =
      operation === "create" ? createRequestId(req, "playlists") : undefined;
    const ref =
      operation === "create"
        ? requestId
          ? db.collection(`users/${uid}/playlists`).doc(requestId)
          : db.collection(`users/${uid}/playlists`).doc()
        : path(uid, id);
    await db.runTransaction(async (tx) => {
      const [profile, playlist] = await Promise.all([
        tx.get(db.doc(`users/${uid}`)),
        tx.get(ref),
      ]);
      if (!profile.exists || profile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (operation === "create" && requestId && playlist.exists) {
        const value = playlist.data();
        if (Object.entries(fields).some(([key, field]) => value[key] !== field))
          throw fail(
            409,
            "Yêu cầu đã được sử dụng cho playlist khác hoặc playlist đã thay đổi.",
          );
        return;
      }
      if (operation !== "create" && !playlist.exists) {
        if (operation === "delete") return;
        throw fail(404, "Không tìm thấy playlist của bạn.");
      }
      if (operation === "delete") {
        tx.delete(ref);
        return;
      }
      if (operation === "create") {
        tx.create(ref, {
          ...fields,
          songIds: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (operation === "edit") {
        tx.update(ref, { ...fields, updatedAt: FieldValue.serverTimestamp() });
        return;
      }
      const ids = new Set(playlist.data().songIds || []),
        songId = req.params.songId;
      if (operation === "add") {
        const song = await tx.get(db.doc(`songs/${songId}`));
        if (!song.exists) throw fail(404, "Bài hát không còn khả dụng.");
        const value = song.data();
        const artist = await tx.get(db.doc(`users/${value.artistId}`));
        const allowed = value.artistId === uid || value.isPublic === true;
        if (
          !artist.exists ||
          artist.data().active === false ||
          value.active !== true ||
          !allowed
        )
          throw fail(403, "Không có quyền thêm bài hát này.");
        ids.add(songId);
      } else ids.delete(songId);
      if (ids.size > 50) throw fail(409, "Playlist tối đa 50 bài.");
      tx.update(ref, {
        songIds: [...ids],
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    res.status(operation === "create" ? 201 : 200).json({ id: ref.id });
  };
  router.post("/playlists", json, mutate("create"));
  router.patch("/playlists/:id", json, mutate("edit"));
  router.delete("/playlists/:id", mutate("delete"));
  router.put("/playlists/:id/songs/:songId", mutate("add"));
  router.delete("/playlists/:id/songs/:songId", mutate("remove"));
  return router;
}
module.exports = { createPlaylistRouter };
