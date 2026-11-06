const express = require("express");
const { FieldValue, FieldPath } = require("firebase-admin/firestore");
const { runTransaction } = require("./transaction.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function validId(id) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw fail(400, "ID không hợp lệ.");
  return id;
}
async function activeAccount(tx, db, uid) {
  const account = await tx.get(db.doc(`users/${uid}`));
  if (!account.exists || account.data().active === false)
    throw fail(403, "Tài khoản không hoạt động.");
}
function createSocialRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  for (const kind of ["favorites", "following"]) {
    router.get(`/${kind}`, async (req, res) => {
      const size = Number(req.query.pageSize || 50);
      if (!Number.isInteger(size) || size < 1 || size > 50)
        throw fail(400, "pageSize phải từ 1 đến 50.");
      let query = db
        .collection(`users/${req.auth.uid}/${kind}`)
        .orderBy(FieldPath.documentId());
      if (req.query.cursor) query = query.startAfter(validId(req.query.cursor));
      const page = await query.limit(size + 1).get(),
        docs = page.docs.slice(0, size);
      res.json({
        items: docs.map((doc) => ({ id: doc.id })),
        nextCursor: page.size > size ? docs.at(-1).id : null,
      });
    });
  }
  const favorite = (add) => async (req, res) => {
    req.resume();
    const uid = req.auth.uid,
      id = validId(req.params.id);
    const ref = db.doc(`users/${uid}/favorites/${id}`);
    await db.runTransaction(async (tx) => {
      await activeAccount(tx, db, uid);
      if (!add) {
        tx.delete(ref);
        return;
      }
      const song = await tx.get(db.doc(`songs/${id}`));
      if (!song.exists) throw fail(404, "Bài hát không còn khả dụng.");
      const value = song.data();
      const artist = await tx.get(db.doc(`users/${value.artistId}`));
      const readable = value.artistId === uid || value.isPublic === true;
      if (
        !artist.exists ||
        artist.data().active === false ||
        value.active !== true ||
        !readable
      )
        throw fail(403, "Không có quyền nghe bài hát.");
      const previous = await tx.get(ref);
      if (!previous.exists)
        tx.create(ref, {
          favoritedAt: FieldValue.serverTimestamp(),
        });
    });
    res.json({ songId: id, favorite: add });
  };
  const follow = (add) => async (req, res) => {
    req.resume();
    const uid = req.auth.uid,
      target = validId(req.params.id);
    if (uid === target) throw fail(400, "Không thể tự theo dõi.");
    const ref = db.doc(`users/${uid}/following/${target}`);
    const ownRef = db.doc(`users/${uid}`);
    const targetRef = db.doc(`users/${target}`);
    const reads = [ref, ownRef, targetRef].sort((a, b) =>
      a.path < b.path ? -1 : 1,
    );
    const counters = await runTransaction(db, async (tx) => {
      // One transactional read RPC avoids overlapping reads against a
      // transaction that may be aborted under concurrent follow/unfollow.
      const snapshots = new Map(
        (await tx.getAll(...reads)).map((snapshot) => [
          snapshot.ref.path,
          snapshot,
        ]),
      );
      const relation = snapshots.get(ref.path);
      const account = snapshots.get(targetRef.path);
      const ownProfile = snapshots.get(ownRef.path);
      if (!ownProfile.exists || ownProfile.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (add && !account.exists) throw fail(404, "Không tìm thấy nghệ sĩ.");
      if (add && account.data().active === false)
        throw fail(403, "Tài khoản này không còn hoạt động.");
      if (relation.exists && !account.exists)
        throw fail(409, "Hồ sơ chưa sẵn sàng. Hãy tải lại.");
      const ownCount = ownProfile.data().followingCount;
      const targetCount = account.exists ? account.data().followerCount : 0;
      const delta = relation.exists === add ? 0 : add ? 1 : -1;
      if (
        ![ownCount, targetCount, ownCount + delta, targetCount + delta].every(
          (count) => Number.isSafeInteger(count) && count >= 0,
        )
      )
        throw fail(409, "Số lượt theo dõi không nhất quán. Hãy tải lại hồ sơ.");
      if (delta) {
        if (add)
          tx.create(ref, {
            followedAt: FieldValue.serverTimestamp(),
          });
        else tx.delete(ref);
        tx.update(ownRef, {
          followingCount: ownCount + delta,
        });
        tx.update(targetRef, {
          followerCount: targetCount + delta,
        });
      }
      return {
        followingCount: ownCount + delta,
        followerCount: targetCount + delta,
      };
    });
    res.json({ targetId: target, following: add, ...counters });
  };
  router.put("/favorites/:id", favorite(true));
  router.delete("/favorites/:id", favorite(false));
  router.put("/following/:id", follow(true));
  router.delete("/following/:id", follow(false));
  return router;
}
module.exports = { createSocialRouter };
