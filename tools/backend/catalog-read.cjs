const express = require("express");
const { FieldPath } = require("firebase-admin/firestore");
const { readSong } = require("./song-read.cjs");
const { mapArtist } = require("./dto.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createCatalogReadRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const list = async (req, res) => {
    const kind = req.params.kind,
      uid = req.auth.uid;
    if (
      ![
        "public-songs",
        "own-songs",
        "artists",
        "albums",
        "follower-songs",
      ].includes(kind)
    )
      throw fail(400, "Nguồn catalog không hợp lệ.");
    const size = Number(req.query.pageSize || 50);
    if (!Number.isInteger(size) || size < 1 || size > 50)
      throw fail(400, "pageSize phải từ 1 đến 50.");
    const validId = (id) => {
      if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(id))
        throw fail(400, "ID không hợp lệ.");
      return id;
    };
    let query;
    if (kind === "artists")
      query = db.collection("users").where("active", "==", true);
    else if (kind === "albums")
      query = db.collection("albums").where("isPublished", "==", true);
    else {
      query = db.collection("songs");
      if (kind === "public-songs")
        query = query
          .where("visibility", "==", "public")
          .where("isPublished", "==", true);
      if (kind === "own-songs") query = query.where("artistId", "==", uid);
      if (kind === "follower-songs") {
        const artistId = validId(req.params.artistId);
        if (!(await db.doc(`users/${uid}/following/${artistId}`).get()).exists)
          throw fail(403, "Không còn theo dõi nghệ sĩ.");
        query = query
          .where("artistId", "==", artistId)
          .where("visibility", "==", "followers")
          .where("active", "==", true);
      }
    }
    query = query.orderBy(FieldPath.documentId());
    if (req.query.cursor) query = query.startAfter(validId(req.query.cursor));
    // Preserve the bounded public seed; Home/Charts/Search use their full APIs.
    const limit = kind === "public-songs" ? 20 : size;
    const page = await query.limit(limit + 1).get(),
      docs = page.docs.slice(0, limit),
      items = [];
    for (const doc of docs) {
      const value = doc.data();
      if (kind === "artists") {
        const projection = await db.doc(`publicProfiles/${doc.id}`).get();
        items.push(
          mapArtist(doc.id, {
            ...value,
            followerCount:
              projection.data()?.followerCount ?? value.followerCount,
            followingCount:
              projection.data()?.followingCount ?? value.followingCount,
          }),
        );
      } else if (kind === "albums") {
        if (!(value.isPublic ?? value.isPublished === true)) continue;
        const artist = await db.doc(`users/${value.artistId}`).get();
        if (!artist.exists || artist.data().active === false || value.deleting)
          continue;
        items.push({
          id: doc.id,
          title: value.title || "",
          artistId: value.artistId,
          artistName: artist.data().displayName || "",
          coverUrl: value.coverUrl || "",
          description: value.description || "",
          isPublished: true,
          isPublic: true,
        });
      } else {
        try {
          items.push(await readSong(db, uid, doc.id));
        } catch (error) {
          if (![403, 404].includes(error.status)) throw error;
        }
      }
    }
    res.json({
      items,
      nextCursor:
        kind !== "public-songs" && page.size > limit ? docs.at(-1).id : null,
    });
  };
  router.get("/catalog/:kind", list);
  router.get("/catalog/:kind/:artistId", list);
  return router;
}
module.exports = { createCatalogReadRouter };
