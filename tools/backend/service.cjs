const { createServer } = require("node:http");
const {
  createHmac,
  randomBytes,
  timingSafeEqual,
  randomUUID,
} = require("node:crypto");
const { SearchIndex, normalize } = require("./search-index.cjs");
const { createAiSearch } = require("./ai/search.cjs");
const { assertProfilesReady, catalogProfile } = require("./profiles.cjs");
const { FollowGraph } = require("./follow-graph.cjs");
const { startRetention } = require("./retention.cjs");
const { createHttpApp, finishHttpApp } = require("./http-app.cjs");
const { createUploadsRouter } = require("./uploads-routes.cjs");
const { createRelatedArtistsRouter } = require("./related-artists.cjs");
const recommendations = require("../../src/utils/recommendations.ts");
const publicSong = (x) => x?.active === true && x?.isPublic === true;
const { mapSong, mapArtist, mapAlbum } = require("./dto.cjs");
// Keep the watch query within the cloud's 10,000-result limit. Reserve one
// result to detect overflow rather than serve a silently truncated graph.
const FOLLOW_GRAPH_CAPACITY = 9999;
async function createBackend({
  db,
  auth,
  projectId,
  secret = randomBytes(32).toString("hex"),
  origins = [],
  mode = "emulator",
}) {
  await assertProfilesReady(db);
  const index = new SearchIndex(),
    songs = new Map(),
    albums = new Map(),
    profiles = new Map(),
    followGraph = new FollowGraph(FOLLOW_GRAPH_CAPACITY);
  const aiSearch = createAiSearch({ db });
  const stops = [],
    snapshots = new Map();
  let healthy = true,
    closed = false;
  const indexSong = (id, value) => {
    index.remove("song", id);
    if (publicSong(value) && profiles.get(value.artistId)?.active === true)
      index.put(
        "song",
        id,
        value.title,
        (profiles.get(value.artistId)?.displayName ||
          value.artistNames?.join(" ") ||
          "") +
          " " +
          (albums.get(value.albumId)?.title || ""),
        value.playCount,
      );
  };
  const indexAlbum = (id, value) => {
    index.remove("album", id);
    if (
      value.isPublic === true &&
      !value.deleting &&
      profiles.get(value.artistId)?.active === true
    )
      index.put(
        "album",
        id,
        value.title,
        profiles.get(value.artistId)?.displayName || "",
      );
  };
  const failure = (error) => {
    healthy = false;
    console.error("Backend sync failed:", error.message);
  };
  const watch = (name, apply) =>
    new Promise((resolve, reject) => {
      let first = true;
      stops.push(
        (typeof name === "string" ? db.collection(name) : name).onSnapshot(
          (snapshot) => {
            if (closed) return;
            try {
              apply(snapshot);
              if (first) {
                first = false;
                resolve();
              }
            } catch (error) {
              failure(error);
              reject(error);
            }
          },
          (error) => {
            failure(error);
            reject(error);
          },
        ),
      );
    });
  const reindexProfiles = (changedIds) => {
    const artistIds = new Set(
      [...songs.values()].filter(publicSong).map((song) => song.artistId),
    );
    for (const [id, value] of profiles) {
      if (changedIds && !changedIds.has(id)) continue;
      index.remove("artist", id);
      index.remove("user", id);
      if (value.active !== false)
        index.put(
          artistIds.has(id) ? "artist" : "user",
          id,
          value.displayName,
          "",
          value.followerCount,
        );
    }
  };
  try {
    await Promise.all([
      watch("users", (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const id = change.doc.id;
          index.remove("artist", id);
          index.remove("user", id);
          if (change.type === "removed") profiles.delete(id);
          else profiles.set(id, catalogProfile(change.doc.data()));
        }
        const changed = new Set(
          snapshot.docChanges().map((change) => change.doc.id),
        );
        reindexProfiles(changed);
        for (const [id, value] of songs)
          if (changed.has(value.artistId)) indexSong(id, value);
        for (const [id, value] of albums)
          if (changed.has(value.artistId)) indexAlbum(id, value);
      }),
      watch(
        db.collectionGroup("following").limit(FOLLOW_GRAPH_CAPACITY + 1),
        (snapshot) => {
          if (snapshot.size > FOLLOW_GRAPH_CAPACITY)
            throw new Error(
              "Follow graph capacity exceeded; refusing partial recommendations.",
            );
          for (const change of snapshot.docChanges())
            followGraph.change(change.doc.ref.path, change.type === "removed");
        },
      ),
      watch("albums", (snapshot) => {
        for (const change of snapshot.docChanges()) {
          const id = change.doc.id,
            value = change.doc.data();
          if (change.type !== "removed" && typeof value.isPublic !== "boolean")
            throw new Error(
              "Legacy album schema found; run target schema migration before starting this backend.",
            );
          index.remove("album", id);
          if (change.type === "removed") albums.delete(id);
          else albums.set(id, value);
          if (change.type !== "removed") indexAlbum(id, value);
          for (const [songId, song] of songs)
            if (song.albumId === id) indexSong(songId, song);
        }
      }),
      watch("songs", (snapshot) => {
        const changedArtists = new Set();
        for (const change of snapshot.docChanges()) {
          const id = change.doc.id,
            value = change.doc.data();
          if (change.type !== "removed" && typeof value.isPublic !== "boolean")
            throw new Error(
              "Legacy song schema found; run target schema migration before starting this backend.",
            );
          const previous = songs.get(id);
          if (
            !previous ||
            publicSong(previous) !== publicSong(value) ||
            previous.artistId !== value.artistId ||
            change.type === "removed"
          ) {
            if (previous) changedArtists.add(previous.artistId);
            changedArtists.add(value.artistId);
          }
          index.remove("song", id);
          if (change.type === "removed") songs.delete(id);
          else songs.set(id, value);
          if (change.type !== "removed") indexSong(id, value);
        }
        if (changedArtists.size) reindexProfiles(changedArtists);
      }),
    ]);
  } catch (error) {
    closed = true;
    stops.forEach((stop) => stop());
    followGraph.clear();
    index.close();
    throw error;
  }
  // The first song snapshot may precede albums. Refresh text once all are ready.
  for (const [id, value] of songs) indexSong(id, value);
  for (const [id, value] of albums) indexAlbum(id, value);
  const worker = startRetention(db, failure);
  const sign = (payload) => {
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    return (
      body + "." + createHmac("sha256", secret).update(body).digest("base64url")
    );
  };
  const error = (status, message) =>
    Object.assign(new Error(message), { status });
  function readCursor(raw, uid, scope) {
    try {
      if (raw.length > 4096) throw Error();
      if (raw.split(".").length !== 2) throw Error();
      const [body, mac] = raw.split("."),
        expected = createHmac("sha256", secret).update(body).digest();
      const actual = Buffer.from(mac, "base64url");
      if (
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw Error();
      const value = JSON.parse(Buffer.from(body, "base64url"));
      const snapshot = snapshots.get(value.id);
      if (
        !snapshot ||
        snapshot.uid !== uid ||
        snapshot.scope !== scope ||
        snapshot.expires < Date.now() ||
        value.epoch !== index.epoch ||
        value.version !== snapshot.version ||
        !Number.isInteger(value.offset) ||
        value.offset < 0 ||
        value.offset > snapshot.keys.length
      )
        throw Error();
      return { snapshot, offset: value.offset, id: value.id };
    } catch {
      throw error(400, "Cursor không hợp lệ hoặc đã hết hạn. Hãy tải lại.");
    }
  }
  async function hydrate(keys) {
    if (!keys.length) return [];
    const refs = keys.map((key) => {
      const colon = key.indexOf(":");
      const kind = key.slice(0, colon),
        id = key.slice(colon + 1);
      return db.doc(
        `${kind === "song" ? "songs" : kind === "album" ? "albums" : "users"}/${id}`,
      );
    });
    const documents = await db.getAll(...refs);
    return keys
      .map((key, i) => {
        const kind = key.slice(0, key.indexOf(":")),
          doc = documents[i];
        if (!doc.exists) return null;
        const value = doc.data();
        if (kind === "song")
          return publicSong(value) &&
            profiles.get(value.artistId)?.active === true
            ? { kind, item: mapSong(doc.id, value, profiles, albums) }
            : null;
        if (kind === "album")
          return value.isPublic === true &&
            !value.deleting &&
            profiles.get(value.artistId)?.active === true
            ? { kind, item: mapAlbum(doc.id, value, profiles) }
            : null;
        return value.active !== false
          ? { kind, item: mapArtist(doc.id, value) }
          : null;
      })
      .filter(Boolean);
  }
  async function page(url, uid, scope, keys, hydratePage = hydrate) {
    const size = Number(url.searchParams.get("pageSize") || 20);
    if (!Number.isInteger(size) || size < 1 || size > 20)
      throw error(400, "pageSize phải từ 1 đến 20.");
    let state;
    const cursor = url.searchParams.get("cursor");
    if (cursor) state = readCursor(cursor, uid, scope);
    else {
      for (const [id, value] of snapshots)
        if (value.expires < Date.now()) snapshots.delete(id);
      if (keys.length > 250000)
        throw error(400, "Quá nhiều kết quả. Hãy thêm từ khóa cụ thể hơn.");
      while (
        snapshots.size >= 256 ||
        [...snapshots.values()].reduce(
          (sum, value) => sum + value.keys.length,
          0,
        ) +
          keys.length >
          250000
      )
        snapshots.delete(snapshots.keys().next().value);
      const id = randomUUID(),
        snapshot = {
          keys,
          uid,
          scope,
          version: index.version,
          expires: Date.now() + 120000,
        };
      snapshots.set(id, snapshot);
      state = { snapshot, offset: 0, id };
    }
    const { snapshot, id } = state;
    let offset = state.offset;
    const items = [];
    // Bounded scan through revoked/deleted results, preserving a continuation.
    for (
      let attempt = 0;
      attempt < 4 && items.length < size && offset < snapshot.keys.length;
      attempt++
    ) {
      const batch = snapshot.keys.slice(offset, offset + (size - items.length));
      offset += batch.length;
      items.push(...(await hydratePage(batch)));
    }
    const hasMore = offset < snapshot.keys.length;
    return {
      items,
      hasMore,
      nextCursor: hasMore
        ? sign({ id, offset, version: snapshot.version, epoch: index.epoch })
        : null,
      indexVersion: snapshot.version,
    };
  }
  const all = () => ({
    songs: [...songs]
      .filter(
        ([, value]) =>
          publicSong(value) && profiles.get(value.artistId)?.active === true,
      )
      .map(([id, value]) => mapSong(id, value, profiles, albums)),
    artists: [...profiles].map(([id, value]) => mapArtist(id, value)),
    albums: [...albums]
      .filter(([, value]) => !value.deleting)
      .map(([id, value]) => mapAlbum(id, value, profiles)),
  });
  const app = createHttpApp({
    auth,
    db,
    origins,
    mode,
    projectId,
    isHealthy: () => healthy,
    onDeactivate: (uid) => {
      const profile = profiles.get(uid);
      if (profile) profiles.set(uid, { ...profile, active: false });
    },
  });
  app.use(
    createRelatedArtistsRouter({ db, getCatalog: all, hydrate, followGraph }),
  );
  app.use(
    createUploadsRouter({
      db,
      songs,
      profiles,
      albums,
      page,
      mapSong,
      normalize,
      error,
    }),
  );
  app.get(
    [
      "/session",
      "/search",
      "/album-info",
      "/browse",
      "/charts",
      "/collection",
      "/discovery",
    ],
    async (request, response) => {
      const send = (status, body) => response.status(status).json(body);
      const token = request.auth;
      const url = new URL(request.originalUrl, "http://backend");
      if (url.pathname === "/session") {
        const profile = await db.doc(`users/${token.uid}`).get();
        return send(profile.exists ? 200 : 404, {
          uid: token.uid,
          displayName: profile.data()?.displayName || "",
        });
      }
      const seed = String(url.searchParams.get("seed") || token.uid).slice(
        0,
        150,
      );
      if (url.pathname === "/search") {
        const raw = url.searchParams.get("q") || "",
          kind = url.searchParams.get("kind") || "";
        if (raw.length > 150 || !["", "song", "album", "artist"].includes(kind))
          throw error(400, "Truy vấn/filter không hợp lệ.");
        const q = normalize(raw);
        const searchMode = url.searchParams.get("mode") || "keyword";
        if (!["keyword", "smart"].includes(searchMode))
          throw error(400, "Chế độ tìm kiếm không hợp lệ.");
        const scope = `search:${q}:${kind}:${searchMode}:${searchMode === "smart" ? `${aiSearch.version}:${raw}` : ""}`;
        const lexical = q ? index.search(q, kind) : [];
        // Reuse the signed result snapshot for subsequent pages, without AI calls.
        const ranked =
          searchMode === "smart" &&
          q &&
          !url.searchParams.get("cursor") &&
          (!kind || kind === "song")
            ? await aiSearch.rank(raw, lexical, all().songs, token.uid)
            : {
                keys: lexical,
                fallbackReason:
                  searchMode === "smart" && kind && kind !== "song"
                    ? "unsupported_filter"
                    : null,
              };
        return send(200, {
          ...(await page(url, token.uid, scope, ranked.keys)),
          searchMode,
          fallbackReason: ranked.fallbackReason,
        });
      }
      const catalog = all();
      if (url.pathname === "/album-info") {
        const id = url.searchParams.get("id") || "";
        const live = await hydrate([`album:${id}`]);
        if (!live.length)
          return send(404, { error: "Album không còn khả dụng." });
        return send(200, {
          album: live[0].item,
          totalPlayCount: catalog.songs
            .filter((song) => song.albumId === id)
            .reduce((sum, song) => sum + song.playCount, 0),
        });
      }
      if (url.pathname === "/browse") {
        const kind = url.searchParams.get("kind");
        if (!["artists", "albums"].includes(kind))
          throw error(400, "Loại danh sách không hợp lệ.");
        const ranked =
          kind === "artists"
            ? recommendations.rankedArtists(
                catalog.artists,
                catalog.songs,
                token.uid,
              )
            : recommendations.trendingAlbums(catalog.songs, catalog.albums);
        return send(
          200,
          await page(
            url,
            token.uid,
            `browse:${kind}`,
            ranked.map(
              (item) => `${kind === "artists" ? "artist" : "album"}:${item.id}`,
            ),
          ),
        );
      }
      if (url.pathname === "/charts")
        return send(200, {
          charts: recommendations.genreCharts(catalog.songs, seed),
        });
      if (url.pathname === "/collection") {
        const artistId = url.searchParams.get("artistId"),
          albumId = url.searchParams.get("albumId"),
          chartId = url.searchParams.get("chartId");
        if (!artistId && !albumId && !chartId)
          throw error(400, "Thiếu collection.");
        const chart = recommendations
          .genreCharts(catalog.songs, seed)
          .find((chart) => chart.id === chartId);
        const ids = chart
          ? chart.songIds
          : catalog.songs
              .filter((song) =>
                artistId
                  ? song.artistId === artistId
                  : song.albumId === albumId,
              )
              .sort(
                (a, b) => b.playCount - a.playCount || a.id.localeCompare(b.id),
              )
              .map((song) => song.id);
        // Chart max 50; artist/album pages use the same real cursor as Search.
        if (chartId)
          return send(200, {
            songs: (await hydrate(ids.map((id) => `song:${id}`))).map(
              (result) => result.item,
            ),
            chart: chart || null,
          });
        return send(
          200,
          await page(
            url,
            token.uid,
            `collection:${artistId || ""}:${albumId || ""}`,
            ids.map((id) => `song:${id}`),
            async (keys) =>
              (await hydrate(keys)).filter(
                (result) =>
                  result.kind === "song" &&
                  (artistId
                    ? result.item.artistId === artistId
                    : result.item.albumId === albumId),
              ),
          ),
        );
      }
      if (url.pathname === "/discovery") {
        const [history, favorites, following] = await Promise.all([
          db
            .collection(`users/${token.uid}/history`)
            .orderBy("playedAt", "desc")
            .limit(100)
            .get(),
          db.collection(`users/${token.uid}/favorites`).limit(500).get(),
          db.collection(`users/${token.uid}/following`).limit(500).get(),
        ]);
        const entries = history.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const suggestions = recommendations.suggestSongs(
          catalog.songs,
          entries,
          20,
          favorites.docs.map((doc) => doc.id),
          following.docs.map((doc) => doc.id),
          seed,
        );
        const homeSongs = recommendations
          .seeded(catalog.songs, seed + "songs")
          .slice(0, 20);
        const artists = recommendations.homeArtists(
          catalog.artists,
          catalog.songs,
          token.uid,
          seed,
        );
        const albumRows = recommendations.homeAlbums(
          catalog.songs,
          catalog.albums,
          seed,
        );
        const liveSongs = await hydrate([
          ...new Set(
            [...suggestions, ...homeSongs].map((song) => `song:${song.id}`),
          ),
        ]);
        const live = new Map(
          liveSongs.map((result) => [result.item.id, result.item]),
        );
        return send(200, {
          suggestions: suggestions.flatMap((song) =>
            live.has(song.id) ? [live.get(song.id)] : [],
          ),
          songs: homeSongs.flatMap((song) =>
            live.has(song.id) ? [live.get(song.id)] : [],
          ),
          artists: (
            await hydrate(artists.map((item) => `artist:${item.id}`))
          ).map((result) => result.item),
          albums: (
            await hydrate(albumRows.map((item) => `album:${item.id}`))
          ).map((result) => ({
            ...result.item,
            totalPlayCount: albumRows.find(
              (album) => album.id === result.item.id,
            ).totalPlayCount,
          })),
        });
      }
      return send(404, { error: "Not found" });
    },
  );
  finishHttpApp(app);
  const server = createServer(app);
  server.on("close", () => {
    closed = true;
    stops.forEach((stop) => stop());
    worker.stop();
    index.close();
    snapshots.clear();
    followGraph.clear();
  });
  server.retention = worker;
  return server;
}
module.exports = { createBackend, mapSong, mapArtist, mapAlbum };
