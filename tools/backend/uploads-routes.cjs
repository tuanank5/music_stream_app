const express = require("express");
function createUploadsRouter({
  db,
  songs,
  profiles,
  albums,
  page,
  mapSong,
  normalize,
  error,
}) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get(
    ["/uploads-info", "/uploads", "/my-albums", "/my-album-info"],
    async (request, response) => {
      const token = request.auth;
      const url = new URL(request.originalUrl, "http://backend");
      const send = (status, body) => response.status(status).json(body);

      const profile = await db.doc(`users/${token.uid}`).get();
      if (!profile.exists || profile.data().active === false)
        return send(403, { error: "Tài khoản của bạn đã bị vô hiệu hóa." });
      const ownAlbum = async (id) => {
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
          throw error(400, "ID album không hợp lệ.");
        const doc = await db.doc(`albums/${id}`).get();
        if (!doc.exists || doc.data().artistId !== token.uid)
          throw error(404, "Không tìm thấy album của bạn.");
        const value = doc.data();
        const tracks = [...songs.values()].filter(
          (song) =>
            song.albumId === id &&
            song.artistId === token.uid &&
            song.active === true,
        );
        return {
          id,
          title: value.title || "",
          artistId: token.uid,
          artistName: profile.data().displayName || "",
          coverUrl: value.coverUrl || "",
          description: value.description || "",
          isPublic: value.isPublic === true,
          songCount: tracks.length,
          durationSeconds: tracks.reduce(
            (sum, song) => sum + (Number(song.durationSeconds) || 0),
            0,
          ),
          totalPlayCount: tracks.reduce(
            (sum, song) => sum + (Number(song.playCount) || 0),
            0,
          ),
        };
      };
      if (url.pathname === "/my-album-info") {
        const album = await ownAlbum(url.searchParams.get("id") || "");
        return send(200, { album, totalPlayCount: album.totalPlayCount });
      }
      if (url.pathname === "/my-albums") {
        const raw = url.searchParams.get("q") || "";
        if (raw.length > 150) throw error(400, "Từ khóa tối đa 150 ký tự.");
        const q = normalize(raw);
        const keys = [...albums]
          .filter(
            ([, album]) =>
              album.artistId === token.uid &&
              normalize(album.title || "").includes(q),
          )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id]) => id);
        const hydrate = async (ids) =>
          (
            await Promise.all(
              ids.map(async (id) => {
                try {
                  return { kind: "album", item: await ownAlbum(id) };
                } catch (failure) {
                  if (failure.status === 404) return null;
                  throw failure;
                }
              }),
            )
          ).filter(Boolean);
        return send(
          200,
          await page(url, token.uid, `my-albums:${q}`, keys, hydrate),
        );
      }
      if (url.pathname === "/uploads") {
        const albumId = url.searchParams.get("albumId") || "";
        const unassigned = url.searchParams.get("unassigned") === "1";
        if (albumId && unassigned)
          throw error(400, "Bộ lọc album không hợp lệ.");
        if (albumId) await ownAlbum(albumId);
        const raw = url.searchParams.get("q") || "";
        if (raw.length > 150) throw error(400, "Từ khóa tối đa 150 ký tự.");
        const q = normalize(raw);
        const keys = [...songs]
          .filter(
            ([, song]) =>
              song.artistId === token.uid &&
              song.active === true &&
              (!albumId || song.albumId === albumId) &&
              (!unassigned || !song.albumId) &&
              normalize(
                `${song.title || ""} ${(song.artistNames || []).join(" ")}`,
              ).includes(q),
          )
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([id]) => `song:${id}`);
        const ownHydrate = async (batch) => {
          if (!batch.length) return [];
          const docs = await db.getAll(
            ...batch.map((key) => db.doc(`songs/${key.slice(5)}`)),
          );
          return docs.flatMap((doc) => {
            const song = doc.data();
            return doc.exists &&
              song.artistId === token.uid &&
              song.active === true &&
              (!albumId || song.albumId === albumId) &&
              (!unassigned || !song.albumId)
              ? [
                  {
                    kind: "song",
                    item: mapSong(doc.id, song, profiles, albums),
                  },
                ]
              : [];
          });
        };
        return send(
          200,
          await page(
            url,
            token.uid,
            `uploads:${q}${albumId ? `:album:${albumId}` : ""}${unassigned ? ":unassigned" : ""}`,
            keys,
            ownHydrate,
          ),
        );
      }
      const uploads = await db
        .collection("songs")
        .where("artistId", "==", token.uid)
        .where("active", "==", true)
        .get();
      const usedSeconds = uploads.docs.reduce((sum, doc) => {
        const duration = Number(doc.data().durationSeconds);
        return sum + (Number.isFinite(duration) && duration > 0 ? duration : 0);
      }, 0);
      return send(200, {
        songCount: uploads.size,
        usedSeconds,
        limitSeconds: 10800,
        percentUsed: (usedSeconds / 10800) * 100,
      });
    },
  );
  return router;
}
module.exports = { createUploadsRouter };
