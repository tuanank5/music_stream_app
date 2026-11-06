const express = require("express");
function chooseRelated(catalog, id, shared = new Map(), following = new Set()) {
  const genres = new Map();
  for (const song of catalog.songs) {
    if (!genres.has(song.artistId)) genres.set(song.artistId, new Set());
    for (const genre of song.genre || []) genres.get(song.artistId).add(genre);
  }
  const target = genres.get(id) || new Set();
  const candidates = catalog.artists.filter(
    (artist) =>
      artist.id !== id && artist.active !== false && genres.has(artist.id),
  );
  const common = candidates.filter(
    (artist) => (shared.get(artist.id) || 0) > 0,
  );
  const popularity = (a, b) =>
    (b.followerCount || 0) - (a.followerCount || 0) || a.id.localeCompare(b.id);
  if (common.length >= 3)
    return {
      title: "Người hâm mộ cũng thích",
      ids: common
        .sort((a, b) => shared.get(b.id) - shared.get(a.id) || popularity(a, b))
        .slice(0, 10)
        .map((artist) => artist.id),
    };
  const score = (artist) =>
    (shared.get(artist.id) || 0) * 100 +
    [...(genres.get(artist.id) || [])].filter((genre) => target.has(genre))
      .length *
      10 +
    (following.has(artist.id) ? 5 : 0);
  const relevant = candidates.filter((artist) => score(artist) > 0);
  return {
    title: relevant.length ? "Có thể bạn thích" : "Khám phá nghệ sĩ",
    ids: [
      ...relevant.sort((a, b) => score(b) - score(a) || popularity(a, b)),
      ...candidates.filter((artist) => score(artist) === 0).sort(popularity),
    ]
      .slice(0, 10)
      .map((artist) => artist.id),
  };
}
function createRelatedArtistsRouter({ db, getCatalog, hydrate, followGraph }) {
  const router = express.Router({ caseSensitive: true, strict: true }),
    cache = new Map();
  router.get("/related-artists", async (req, res) => {
    const id = req.query.id;
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
      return res.status(400).json({ error: "ID không hợp lệ." });
    const target = await db.doc(`users/${id}`).get();
    if (!target.exists || target.data().active === false)
      return res.status(404).json({ error: "Hồ sơ không còn khả dụng." });
    let result = cache.get(id);
    if (
      !result ||
      result.expires < Date.now() ||
      result.graphVersion !== followGraph.version
    ) {
      const graphVersion = followGraph.version;
      const followerIds = followGraph.followers(id);
      const followerProfiles = followerIds.length
        ? await db.getAll(...followerIds.map((uid) => db.doc(`users/${uid}`)))
        : [];
      const activeFollowers = followerProfiles.filter(
        (doc) => doc.exists && doc.data().active !== false,
      );
      const shared = new Map();
      for (const follower of activeFollowers)
        for (const targetId of followGraph.following(follower.id))
          shared.set(targetId, (shared.get(targetId) || 0) + 1);
      result = {
        ...chooseRelated(
          getCatalog(),
          id,
          shared,
          new Set(followGraph.following(id)),
        ),
        expires: Date.now() + 30000,
        graphVersion,
      };
      if (cache.size >= 256) cache.delete(cache.keys().next().value);
      cache.set(id, result);
    }
    const eligible = new Set(getCatalog().songs.map((song) => song.artistId));
    const artists = (
      await hydrate(
        result.ids
          .filter((uid) => eligible.has(uid))
          .map((uid) => `artist:${uid}`),
      )
    ).map((row) => row.item);
    res.json({ title: result.title, artists });
  });
  return router;
}
module.exports = { createRelatedArtistsRouter, chooseRelated };
