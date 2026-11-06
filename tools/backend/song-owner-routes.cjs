const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { imageUrl, localMediaPath } = require("./local-media.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createSongOwnerRouter({ db, mode }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const mutate = (remove) => async (req, res) => {
    const { id } = req.params;
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw fail(400, "ID bài hát không hợp lệ.");
    let coverUrl;
    if (!remove) {
      const value = req.body;
      if (
        !value ||
        Array.isArray(value) ||
        Object.keys(value).some((key) => key !== "coverUrl") ||
        typeof value.coverUrl !== "string" ||
        value.coverUrl.length > 2048
      )
        throw fail(400, "Ảnh bìa không hợp lệ.");
      coverUrl = value.coverUrl;
      imageUrl(coverUrl, req.auth.uid, mode);
      try {
        if (!localMediaPath(coverUrl)) {
          const url = new URL(coverUrl);
          if (url.protocol !== "https:" || url.username || url.password)
            throw Error();
        }
      } catch {
        throw fail(400, "Ảnh bìa phải là URL HTTPS.");
      }
    } else req.resume();
    const ref = db.doc(`songs/${id}`);
    await db.runTransaction(async (tx) => {
      const [profile, song] = await Promise.all([
        tx.get(db.doc(`users/${req.auth.uid}`)),
        tx.get(ref),
      ]);
      if (!profile.exists || profile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (!song.exists) throw fail(404, "Không tìm thấy bài hát.");
      if (song.data().artistId !== req.auth.uid)
        throw fail(403, "Bạn không sở hữu bài hát này.");
      if (!remove && song.data().active !== true)
        throw fail(409, "Bài hát đã được gỡ.");
      tx.update(ref, {
        ...(remove ? { active: false } : { coverUrl, coverPublicId: null }),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    res.json({ id, ...(remove ? { active: false } : { coverUrl }) });
  };
  router.delete("/songs/:id", mutate(true));
  router.patch(
    "/songs/:id/cover",
    express.json({ limit: "32kb" }),
    mutate(false),
  );
  return router;
}
module.exports = { createSongOwnerRouter };
