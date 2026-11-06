const express = require("express");
const { FieldValue } = require("firebase-admin/firestore");
const { imageUrl, localMediaPath } = require("./local-media.cjs");
const { prepareImage, stageImageChange } = require("./image-assets.cjs");
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
    const prepared = !remove
      ? await prepareImage(
          req.auth.uid,
          coverUrl,
          mode,
          mode === "cloud" ? (await ref.get()).data()?.coverUrl : undefined,
        )
      : null;
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
      const change = !remove
        ? await stageImageChange(tx, db, req.auth.uid, ref.path, prepared, {
            url: song.data().coverUrl,
            publicId: song.data().coverPublicId,
          })
        : null;
      change?.write();
      tx.update(ref, {
        ...(remove
          ? { active: false }
          : { coverUrl, coverPublicId: change.publicId }),
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
