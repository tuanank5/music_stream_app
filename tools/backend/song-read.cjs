const express = require("express");
const { mapSong } = require("./dto.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
async function readSong(db, uid, id) {
  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
    throw fail(400, "ID bài hát không hợp lệ.");
  const track = await db.doc(`songs/${id}`).get();
  if (!track.exists || track.data().active !== true)
    throw fail(404, "Bài hát không còn khả dụng.");
  const value = track.data(),
    artist = await db.doc(`users/${value.artistId}`).get();
  if (!artist.exists || artist.data().active === false)
    throw fail(404, "Bài hát không còn khả dụng.");
  let readable =
    value.artistId === uid ||
    (value.isPublic ??
      (value.visibility === "public" && value.isPublished === true)) ||
    value.visibility === "unlisted";
  if (!readable && value.visibility === "followers")
    readable = (await db.doc(`users/${uid}/following/${value.artistId}`).get())
      .exists;
  if (!readable) throw fail(403, "Không có quyền nghe bài hát.");
  const albums = new Map();
  if (value.albumId) {
    const album = await db.doc(`albums/${value.albumId}`).get();
    if (
      album.exists &&
      !album.data().deleting &&
      (album.data().artistId === uid ||
        (album.data().isPublic ?? album.data().isPublished === true))
    )
      albums.set(album.id, album.data());
  }
  return mapSong(
    track.id,
    value,
    new Map([[artist.id, artist.data()]]),
    albums,
  );
}
function createSongReadRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/songs/:id", async (req, res) =>
    res.json(await readSong(db, req.auth.uid, req.params.id)),
  );
  router.get("/song-items/:id", async (req, res) =>
    res.json({
      items: [await readSong(db, req.auth.uid, req.params.id)],
      nextCursor: null,
    }),
  );
  return router;
}
module.exports = { createSongReadRouter, readSong };
