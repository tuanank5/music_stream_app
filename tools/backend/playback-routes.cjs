const express = require("express");
const { FieldValue, Timestamp } = require("firebase-admin/firestore");
const { advancePlayback, mayCountPlayback } = require("./playback-policy.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createPlaybackRouter({ db, now = Date.now }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  const sessions = new Map(),
    queues = new Map();
  router.post(
    "/playback/:id",
    express.json({ limit: "16kb" }),
    async (req, res) => {
      const uid = req.auth.uid,
        id = req.params.id,
        body = req.body;
      if (
        !/^[A-Za-z0-9_-]{1,128}$/.test(id) ||
        !body ||
        Array.isArray(body) ||
        Object.keys(body).some(
          (key) =>
            !["songId", "sequence", "progressSeconds", "ranges"].includes(key),
        ) ||
        typeof body.songId !== "string" ||
        !/^[A-Za-z0-9_-]{1,128}$/.test(body.songId) ||
        !Number.isSafeInteger(body.sequence) ||
        body.sequence < 0
      )
        throw fail(400, "Phiên playback không hợp lệ.");
      const previous = queues.get(uid) || Promise.resolve();
      const work = previous
        .catch(() => {})
        .then(async () => {
          const time = now(),
            key = `${uid}:${id}`;
          for (const [key, session] of sessions)
            if (time - session.at > 1800000) sessions.delete(key);
          const session = sessions.get(key);
          if (session && session.songId !== body.songId)
            throw fail(409, "Phiên đã thuộc bài khác.");
          if (!session && body.sequence !== 0)
            throw fail(409, "Phiên đã hết hạn. Hãy bắt đầu phiên mới.");
          if (!session && sessions.size >= 5000)
            throw fail(503, "Máy chủ playback đang bận.");
          const historyRef = db.doc(`users/${uid}/history/${id}`),
            songRef = db.doc(`songs/${body.songId}`),
            receiptRef = db.doc(`users/${uid}/playReceipts/${body.songId}`);
          let nextSession;
          const result = await db.runTransaction(async (tx) => {
            const [account, track, history, receipt, latest] =
              await Promise.all([
                tx.get(db.doc(`users/${uid}`)),
                tx.get(songRef),
                tx.get(historyRef),
                tx.get(receiptRef),
                tx.get(
                  db
                    .collection(`users/${uid}/history`)
                    .orderBy("playedAt", "desc")
                    .limit(1),
                ),
              ]);
            if (!account.exists || account.data().active === false)
              throw fail(403, "Tài khoản không hoạt động.");
            if (!track.exists || track.data().active !== true)
              throw fail(404, "Bài hát không còn khả dụng.");
            const song = track.data(),
              artist = await tx.get(db.doc(`users/${song.artistId}`));
            let readable =
              song.artistId === uid ||
              (song.isPublic ??
                (song.visibility === "public" && song.isPublished === true)) ||
              song.visibility === "unlisted";
            if (!readable && song.visibility === "followers")
              readable = (
                await tx.get(db.doc(`users/${uid}/following/${song.artistId}`))
              ).exists;
            if (!artist.exists || artist.data().active === false || !readable)
              throw fail(403, "Không có quyền nghe bài hát.");
            const duration = song.durationSeconds;
            if (!Number.isFinite(duration) || duration <= 0 || duration > 86400)
              throw fail(409, "Thời lượng bài hát không hợp lệ.");
            if (!session) {
              if (history.exists)
                throw fail(
                  409,
                  "Không thể khôi phục phiên cũ. Hãy tạo phiên mới.",
                );
              if (
                body.progressSeconds !== 0 ||
                !Array.isArray(body.ranges) ||
                body.ranges.length
              )
                throw fail(400, "Phiên mới phải bắt đầu với telemetry rỗng.");
              const state = {
                sequence: 0,
                progressSeconds: 0,
                listenedSeconds: 0,
                coverage: [],
                completed: false,
              };
              const values = {
                historyId: id,
                songId: body.songId,
                playedAt: Timestamp.fromMillis(time),
                startedAt: Timestamp.fromMillis(time),
                durationSeconds: duration,
                progressSeconds: 0,
                listenedSeconds: 0,
                completed: false,
                counted: false,
              };
              tx.create(historyRef, values);
              nextSession = { songId: body.songId, duration, state, at: time };
              return {
                historyId: id,
                sequence: 0,
                listenedSeconds: 0,
                completed: false,
                counted: false,
                refresh: true,
              };
            }
            if (
              !history.exists ||
              history.data().songId !== body.songId ||
              duration !== session.duration
            )
              throw fail(409, "Phiên playback không còn hợp lệ.");
            if (body.sequence <= session.state.sequence)
              return { ...session.result, refresh: false };
            const globalAt =
              latest.docs[0]?.data().playedAt?.toMillis?.() || time;
            const elapsed = Math.max(
              0,
              Math.min(time - session.at, time - globalAt) / 1000,
            );
            const { songId, ...packet } = body;
            const state = advancePlayback(
              session.state,
              packet,
              duration,
              elapsed,
            );
            const counted = history.data().counted === true;
            const eligible = mayCountPlayback(
              state,
              duration,
              counted,
              time,
              receipt.exists ? receipt.data().countedAt.toMillis() : null,
            );
            tx.update(historyRef, {
              playedAt: Timestamp.fromMillis(time),
              progressSeconds: state.progressSeconds,
              durationSeconds: duration,
              listenedSeconds: state.listenedSeconds,
              completed: state.completed,
              counted: counted || eligible,
            });
            if (eligible) {
              tx.set(receiptRef, {
                historyId: id,
                countedAt: Timestamp.fromMillis(time),
              });
              tx.update(songRef, {
                playCount: FieldValue.increment(1),
                lastPlayUid: uid,
                lastPlayHistoryId: id,
              });
            }
            nextSession = { ...session, state, at: time };
            return {
              historyId: id,
              sequence: state.sequence,
              listenedSeconds: state.listenedSeconds,
              completed: state.completed,
              counted: counted || eligible,
              refresh: eligible || state.completed !== session.state.completed,
            };
          });
          if (nextSession) sessions.set(key, { ...nextSession, result });
          return result;
        });
      queues.set(uid, work);
      try {
        res.json(await work);
      } finally {
        if (queues.get(uid) === work) queues.delete(uid);
      }
    },
  );
  return router;
}
module.exports = { createPlaybackRouter };
