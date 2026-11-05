const express = require("express");
const { FieldPath, Timestamp } = require("firebase-admin/firestore");
const { mapSong } = require("./dto.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createHistoryReadRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/recent-history", async (req, res) => {
    const page = await db
      .collection(`users/${req.auth.uid}/history`)
      .orderBy("playedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc")
      .limit(100)
      .get();
    res.json({
      items: page.docs.map((doc) => {
        const value = doc.data();
        return {
          id: doc.id,
          songId: String(value.songId || ""),
          playedAt: value.playedAt?.toMillis?.() || 0,
          progressSeconds: Number(value.progressSeconds) || 0,
          durationSeconds: Number(value.durationSeconds) || 0,
          listenedSeconds: Number(value.listenedSeconds) || 0,
          completed: value.completed === true,
          counted: value.counted === true,
        };
      }),
      nextCursor: null,
    });
  });
  router.get("/history", async (req, res) => {
    let query = db
      .collection(`users/${req.auth.uid}/history`)
      .orderBy("playedAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (req.query.cursor) {
      try {
        const cursor = JSON.parse(
          Buffer.from(req.query.cursor, "base64url").toString(),
        );
        if (
          cursor.uid !== req.auth.uid ||
          !/^[A-Za-z0-9_-]{1,128}$/.test(cursor.id) ||
          !Number.isSafeInteger(cursor.seconds) ||
          !Number.isInteger(cursor.nanos) ||
          cursor.nanos < 0 ||
          cursor.nanos >= 1e9
        )
          throw Error();
        query = query.startAfter(
          new Timestamp(cursor.seconds, cursor.nanos),
          cursor.id,
        );
      } catch {
        throw fail(400, "Cursor lịch sử không hợp lệ.");
      }
    }
    const page = await query.limit(21).get(),
      docs = page.docs.slice(0, 20),
      items = [];
    for (const doc of docs) {
      const value = doc.data();
      const entry = {
        id: doc.id,
        songId: String(value.songId || ""),
        playedAt: value.playedAt?.toMillis?.() || 0,
        progressSeconds: Number(value.progressSeconds) || 0,
        durationSeconds: Number(value.durationSeconds) || 0,
        listenedSeconds: Number(value.listenedSeconds) || 0,
        completed: value.completed === true,
        counted: value.counted === true,
      };
      let song = null;
      if (/^[A-Za-z0-9_-]{1,128}$/.test(entry.songId)) {
        const track = await db.doc(`songs/${entry.songId}`).get();
        if (track.exists && track.data().active === true) {
          const data = track.data(),
            artist = await db.doc(`users/${data.artistId}`).get();
          let allowed =
            data.artistId === req.auth.uid ||
            (data.isPublic ??
              (data.visibility === "public" && data.isPublished === true)) ||
            data.visibility === "unlisted";
          if (!allowed && data.visibility === "followers")
            allowed = (
              await db
                .doc(`users/${req.auth.uid}/following/${data.artistId}`)
                .get()
            ).exists;
          if (artist.exists && artist.data().active !== false && allowed) {
            const profiles = new Map([[artist.id, artist.data()]]),
              albums = new Map();
            if (data.albumId) {
              const album = await db.doc(`albums/${data.albumId}`).get();
              if (
                album.exists &&
                !album.data().deleting &&
                (album.data().artistId === req.auth.uid ||
                  (album.data().isPublic ?? album.data().isPublished === true))
              )
                albums.set(album.id, album.data());
            }
            song = mapSong(track.id, data, profiles, albums);
          }
        }
      }
      items.push({ entry, song });
    }
    const last = docs.at(-1),
      time = last?.data().playedAt;
    const nextCursor =
      page.size > 20 && time
        ? Buffer.from(
            JSON.stringify({
              uid: req.auth.uid,
              id: last.id,
              seconds: time.seconds,
              nanos: time.nanoseconds,
            }),
          ).toString("base64url")
        : null;
    res.json({ items, nextCursor });
  });
  return router;
}
module.exports = { createHistoryReadRouter };
