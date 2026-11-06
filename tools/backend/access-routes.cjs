const express = require("express");
const fail = (status, message) => Object.assign(new Error(message), { status });
function validId(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(value))
    throw fail(400, "ID không hợp lệ.");
  return value;
}
function createAccessRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/profiles/:id", async (req, res) => {
    const id = validId(req.params.id);
    const account = await db.doc(`users/${id}`).get();
    if (!account.exists || account.data().active === false)
      throw fail(404, "Hồ sơ không còn khả dụng.");
    const value = account.data();
    res.json({
      id,
      name: value.displayName || "",
      imageUrl: value.avatarUrl || "",
      biography: value.biography || "",
      active: true,
      followerCount: Number(value.followerCount) || 0,
      followingCount: Number(value.followingCount) || 0,
    });
  });
  router.get("/access", async (req, res) => {
    const id = validId(req.query.id),
      kind = req.query.kind;
    if (!["song", "album", "artist"].includes(kind))
      throw fail(400, "Loại nội dung không hợp lệ.");
    const doc = await db
      .doc(
        `${kind === "song" ? "songs" : kind === "album" ? "albums" : "users"}/${id}`,
      )
      .get();
    if (!doc.exists) return res.json({ accessible: false });
    const value = doc.data();
    if (kind === "artist")
      return res.json({ accessible: value.active !== false });
    const artist = await db.doc(`users/${value.artistId}`).get();
    let accessible =
      artist.exists &&
      artist.data().active !== false &&
      (kind !== "song" || value.active === true) &&
      !value.deleting;
    if (accessible && value.artistId !== req.auth.uid) {
      accessible = value.isPublic === true;
    }
    res.json({ accessible: !!accessible });
  });
  return router;
}
module.exports = { createAccessRouter };
