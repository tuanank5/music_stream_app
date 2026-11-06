const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const fail = (status, message) => Object.assign(new Error(message), { status });
function albumDto(id, album, artist) {
  return {
    id,
    title: album.title || "",
    artistId: album.artistId,
    artistName: artist.displayName || "",
    coverUrl: album.coverUrl || "",
    description: album.description || "",
    isPublic: album.isPublic === true,
  };
}
const readable = (album, uid, artist) =>
  artist?.active !== false &&
  !album.deleting &&
  (album.artistId === uid || album.isPublic === true);
function createFavoriteAlbumsRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/favorite-albums", async (req, res) => {
    const favorites = await db
      .collection(`users/${req.auth.uid}/favoriteAlbums`)
      .get();
    const albums = [];
    for (let offset = 0; offset < favorites.size; offset += 100) {
      const docs = await db.getAll(
        ...favorites.docs
          .slice(offset, offset + 100)
          .map((doc) => db.doc(`albums/${doc.id}`)),
      );
      const ownerIds = [
        ...new Set(
          docs.filter((doc) => doc.exists).map((doc) => doc.data().artistId),
        ),
      ];
      const owners = ownerIds.length
        ? await db.getAll(...ownerIds.map((uid) => db.doc(`users/${uid}`)))
        : [];
      const profiles = new Map(
        owners.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
      );
      for (const doc of docs)
        if (
          doc.exists &&
          profiles.has(doc.data().artistId) &&
          readable(doc.data(), req.auth.uid, profiles.get(doc.data().artistId))
        )
          albums.push(
            albumDto(doc.id, doc.data(), profiles.get(doc.data().artistId)),
          );
    }
    res.json({ albums });
  });
  const change = (add) => async (req, res) => {
    req.resume();
    const id = req.params.id;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw fail(400, "ID album không hợp lệ.");
    const ref = db.doc(`users/${req.auth.uid}/favoriteAlbums/${id}`);
    const album = await db.runTransaction(async (tx) => {
      const profile = await tx.get(db.doc(`users/${req.auth.uid}`));
      if (!profile.exists || profile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (!add) {
        tx.delete(ref);
        return null;
      }
      const snapshot = await tx.get(db.doc(`albums/${id}`));
      if (!snapshot.exists) throw fail(404, "Album không còn khả dụng.");
      const data = snapshot.data();
      const artist = await tx.get(db.doc(`users/${data.artistId}`));
      if (!artist.exists || !readable(data, req.auth.uid, artist.data()))
        throw fail(403, "Không có quyền xem album.");
      const previous = await tx.get(ref);
      if (!previous.exists)
        tx.create(ref, { favoritedAt: FieldValue.serverTimestamp() });
      return albumDto(id, data, artist.data());
    });
    res.json({ album });
  };
  router.put("/favorite-albums/:id", change(true));
  router.delete("/favorite-albums/:id", change(false));
  return router;
}
module.exports = { createFavoriteAlbumsRouter };
