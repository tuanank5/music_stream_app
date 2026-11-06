const express = require("express");
const { createHash } = require("node:crypto");
const { FieldValue, FieldPath } = require("firebase-admin/firestore");
const fail = (status, message) => Object.assign(new Error(message), { status });
function id(value) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(value))
    throw fail(400, "ID không hợp lệ.");
  return value;
}
function body(value, comment, create) {
  const keys = !comment && create ? ["content", "songId"] : ["content"];
  const max = comment ? 1000 : 2000;
  if (
    !value ||
    Array.isArray(value) ||
    typeof value !== "object" ||
    Object.keys(value).some((key) => !keys.includes(key)) ||
    typeof value.content !== "string" ||
    !value.content.trim() ||
    value.content.trim().length > max
  )
    throw fail(400, "Nội dung không hợp lệ.");
  const fields = { content: value.content.trim() };
  if (!comment && create) {
    if (typeof value.songId !== "string")
      throw fail(400, "Bài hát không hợp lệ.");
    if (value.songId) id(value.songId);
    fields.songId = value.songId || null;
  }
  return fields;
}
function createFeedRouter({ db }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const json = express.json({ limit: "16kb" });
  const list = (comments) => async (req, res) => {
    const size = Number(req.query.pageSize || 20);
    if (!Number.isInteger(size) || size < 1 || size > 50)
      throw fail(400, "Kích thước trang không hợp lệ.");
    let collection = db.collection("posts");
    if (comments) {
      const post = await collection.doc(id(req.params.postId)).get();
      if (!post.exists || post.data().active !== true)
        throw fail(404, "Bài đăng không còn khả dụng.");
      const author = await db.doc(`users/${post.data().ownerId}`).get();
      if (!author.exists || author.data().active === false)
        throw fail(404, "Bài đăng không còn khả dụng.");
      collection = post.ref.collection("comments");
    }
    let query = collection
      .orderBy("createdAt", "desc")
      .orderBy(FieldPath.documentId(), "desc");
    if (req.query.cursor) {
      const cursor = await collection.doc(id(req.query.cursor)).get();
      if (!cursor.exists)
        throw fail(400, "Cursor không còn khả dụng. Hãy tải lại.");
      query = query.startAfter(cursor);
    }
    const snapshot = await query.limit(size + 1).get();
    const page = snapshot.docs.slice(0, size);
    const ids = [...new Set(page.map((doc) => doc.data().ownerId))];
    const authors = ids.length
      ? await db.getAll(...ids.map((uid) => db.doc(`users/${uid}`)))
      : [];
    const profiles = new Map(
      authors
        .filter((doc) => doc.exists && doc.data().active !== false)
        .map((doc) => [doc.id, doc.data()]),
    );
    const items = [];
    for (const doc of page) {
      const value = doc.data(),
        author = profiles.get(value.ownerId);
      if (!author || (!comments && value.active !== true)) continue;
      let songId = comments ? undefined : value.songId || "";
      if (songId) {
        const song = await db.doc(`songs/${songId}`).get();
        const track = song.data();
        const artist = track
          ? await db.doc(`users/${track.artistId}`).get()
          : null;
        if (
          !track ||
          track.active !== true ||
          track.isPublic !== true ||
          !artist?.exists ||
          artist.data().active === false
        )
          songId = "";
      }
      items.push({
        id: doc.id,
        ownerId: value.ownerId,
        authorName: author.displayName || "Người dùng",
        content: value.content || "",
        createdAt: value.createdAt?.toMillis?.() || 0,
        ...(!comments ? { active: true, songId } : {}),
      });
    }
    res.json({
      items,
      nextCursor: snapshot.size > size ? page.at(-1).id : null,
    });
  };
  router.get("/posts", list(false));
  router.get("/posts/:postId/comments", list(true));
  const mutate = (comment, operation) => async (req, res) => {
    const uid = req.auth.uid,
      create = operation === "create",
      remove = operation === "delete";
    const posts = db.collection("posts");
    const key = req.headers["idempotency-key"];
    if (
      key !== undefined &&
      (typeof key !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(key))
    )
      throw fail(400, "Idempotency key không hợp lệ.");
    const stableId =
      create && key
        ? createHash("sha256").update(`${uid}:${key}`).digest("hex")
        : undefined;
    const postRef =
      comment || !create
        ? posts.doc(id(req.params.postId))
        : stableId
          ? posts.doc(stableId)
          : posts.doc();
    const ref = comment
      ? create
        ? stableId
          ? postRef.collection("comments").doc(stableId)
          : postRef.collection("comments").doc()
        : postRef.collection("comments").doc(id(req.params.commentId))
      : postRef;
    const fields = remove ? null : body(req.body, comment, create);
    if (remove) req.resume();
    await db.runTransaction(async (tx) => {
      const account = await tx.get(db.doc(`users/${uid}`));
      if (!account.exists || account.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      if (create && stableId) {
        const existing = await tx.get(ref);
        if (existing.exists) {
          const value = existing.data();
          if (
            value.ownerId !== uid ||
            Object.entries(fields).some(([key, field]) => value[key] !== field)
          )
            throw fail(409, "Yêu cầu đã được sử dụng cho nội dung khác.");
          return;
        }
      }
      let post;
      if (comment || !create) {
        post = await tx.get(postRef);
        if (!post.exists) throw fail(404, "Bài đăng không còn khả dụng.");
      }
      if (comment && !remove) {
        const author = await tx.get(db.doc(`users/${post.data().ownerId}`));
        if (
          !author.exists ||
          author.data().active === false ||
          post.data().active !== true
        )
          throw fail(403, "Bài đăng không còn khả dụng.");
      }
      if (!create) {
        const previous = comment ? await tx.get(ref) : post;
        if (!previous.exists) {
          if (comment && remove) return;
          throw fail(404, "Nội dung không còn khả dụng.");
        }
        if (previous.data().ownerId !== uid)
          throw fail(403, "Chỉ chủ sở hữu được thay đổi nội dung.");
        if (!comment && !remove && previous.data().active !== true)
          throw fail(409, "Bài đăng đã được gỡ.");
      }
      if (!comment && create && fields.songId) {
        const song = await tx.get(db.doc(`songs/${fields.songId}`));
        if (!song.exists) throw fail(404, "Bài hát không còn khả dụng.");
        const value = song.data();
        const artist = await tx.get(db.doc(`users/${value.artistId}`));
        if (
          !artist.exists ||
          artist.data().active === false ||
          value.active !== true ||
          value.isPublic !== true
        )
          throw fail(403, "Chỉ chia sẻ bài hát công khai còn khả dụng.");
      }
      if (remove) {
        if (comment) tx.delete(ref);
        else
          tx.update(ref, {
            active: false,
            updatedAt: FieldValue.serverTimestamp(),
          });
      } else if (create) {
        tx.create(ref, {
          ...fields,
          ownerId: uid,
          ...(!comment ? { active: true } : {}),
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else
        tx.update(ref, { ...fields, updatedAt: FieldValue.serverTimestamp() });
    });
    res.status(create ? 201 : 200).json({ id: ref.id });
  };
  router.post("/posts", json, mutate(false, "create"));
  router.patch("/posts/:postId", json, mutate(false, "edit"));
  router.delete("/posts/:postId", mutate(false, "delete"));
  router.post("/posts/:postId/comments", json, mutate(true, "create"));
  router.patch(
    "/posts/:postId/comments/:commentId",
    json,
    mutate(true, "edit"),
  );
  router.delete("/posts/:postId/comments/:commentId", mutate(true, "delete"));
  return router;
}
module.exports = { createFeedRouter };
