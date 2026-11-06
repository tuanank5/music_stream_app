const { FieldPath } = require("firebase-admin/firestore");
const { mapSong } = require("./dto.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
const publicSong = (value) => value.active === true && value.isPublic === true;
async function readPlaylist(db, viewer, ownerId, id, source) {
  const profile = await db.doc(`users/${ownerId}`).get();
  const snapshot =
    source || (await db.doc(`users/${ownerId}/playlists/${id}`).get());
  if (!profile.exists || profile.data().active === false || !snapshot.exists)
    throw fail(404, "Playlist không còn khả dụng.");
  const value = snapshot.data(),
    own = viewer.uid === ownerId;
  if (!own && value.isPublic !== true)
    throw fail(404, "Playlist không còn khả dụng.");
  const ids = [...new Set(value.songIds || [])].slice(0, 50);
  const docs = ids.length
    ? await db.getAll(...ids.map((songId) => db.doc(`songs/${songId}`)))
    : [];
  const artists = [
    ...new Set(
      docs.filter((doc) => doc.exists).map((doc) => doc.data().artistId),
    ),
  ];
  const artistDocs = artists.length
    ? await db.getAll(...artists.map((uid) => db.doc(`users/${uid}`)))
    : [];
  const profiles = new Map(
    artistDocs.filter((doc) => doc.exists).map((doc) => [doc.id, doc.data()]),
  );
  const tracks = [];
  for (const doc of docs) {
    if (!doc.exists) continue;
    const song = doc.data(),
      artist = profiles.get(song.artistId);
    if (!artist || artist.active === false || song.active !== true) continue;
    let allowed = publicSong(song);
    if (own) {
      allowed ||= song.artistId === viewer.uid;
    }
    if (allowed) tracks.push({ id: doc.id, value: song });
  }
  const albumIds = [
    ...new Set(tracks.map((row) => row.value.albumId).filter(Boolean)),
  ];
  const albumDocs = albumIds.length
    ? await db.getAll(...albumIds.map((albumId) => db.doc(`albums/${albumId}`)))
    : [];
  const albums = new Map(
    albumDocs
      .filter(
        (doc) =>
          doc.exists &&
          !doc.data().deleting &&
          (doc.data().artistId === viewer.uid || doc.data().isPublic === true),
      )
      .map((doc) => [doc.id, doc.data()]),
  );
  const songs = tracks.map((row) =>
    mapSong(row.id, row.value, profiles, albums),
  );
  return {
    playlist: {
      id,
      ownerId,
      ownerName: profile.data().displayName || "",
      name: value.name || "",
      description: value.description || "",
      isPublic: value.isPublic === true,
      songIds: own ? ids : songs.map((song) => song.id),
      songCount: songs.length,
      coverUrl: songs.find((song) => song.cover)?.cover || "",
    },
    songs,
    own,
  };
}
function registerPlaylistReads(router, db) {
  const validate = (value) => {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(value || ""))
      throw fail(400, "ID không hợp lệ.");
    return value;
  };
  router.get("/my-playlists", async (req, res) => {
    const size = Number(req.query.pageSize || 50);
    if (!Number.isInteger(size) || size < 1 || size > 50)
      throw fail(400, "pageSize phải từ 1 đến 50.");
    let query = db
      .collection(`users/${req.auth.uid}/playlists`)
      .orderBy(FieldPath.documentId());
    if (req.query.cursor) query = query.startAfter(validate(req.query.cursor));
    const page = await query.limit(size + 1).get();
    const docs = page.docs.slice(0, size);
    res.json({
      items: docs.map((doc) => {
        const value = doc.data();
        return {
          id: doc.id,
          name: String(value.name || ""),
          description: String(value.description || ""),
          songIds: Array.isArray(value.songIds) ? value.songIds : [],
          isPublic: value.isPublic === true,
        };
      }),
      nextCursor: page.size > size ? docs.at(-1).id : null,
    });
  });
  router.get("/playlist-info", async (req, res) => {
    const ownerId = validate(req.query.ownerId || req.auth.uid),
      id = validate(req.query.id);
    res.json(await readPlaylist(db, req.auth, ownerId, id));
  });
  router.get("/user-playlists", async (req, res) => {
    const ownerId = validate(req.query.ownerId),
      size = Number(req.query.pageSize || 20);
    if (!Number.isInteger(size) || size < 1 || size > 20)
      throw fail(400, "pageSize phải từ 1 đến 20.");
    const profile = await db.doc(`users/${ownerId}`).get();
    if (!profile.exists || profile.data().active === false)
      throw fail(404, "Hồ sơ không còn khả dụng.");
    let query = db
      .collection(`users/${ownerId}/playlists`)
      .where("isPublic", "==", true)
      .orderBy(FieldPath.documentId());
    if (req.query.cursor) query = query.startAfter(validate(req.query.cursor));
    const page = await query.limit(size).get();
    const items = [];
    for (const doc of page.docs) {
      try {
        const row = await readPlaylist(db, { uid: "" }, ownerId, doc.id, doc);
        if (row.songs.length) items.push(row.playlist);
      } catch (failure) {
        if (failure.status !== 404) throw failure;
      }
    }
    res.json({
      items,
      hasMore: page.size === size,
      nextCursor: page.size === size ? page.docs.at(-1).id : null,
    });
  });
}
module.exports = { registerPlaylistReads };
