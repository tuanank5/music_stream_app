// Run only from tools on an administrator's computer. Never import into src.
const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");
const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
const projectId = args.includes("--project") ? option("--project") : "";
if (!projectId || projectId.startsWith("--"))
  throw new Error(
    "Cần --project PROJECT_ID. Mặc định chỉ dry-run. Thêm --apply để chuyển dữ liệu.",
  );
const admin = require("firebase-admin");
admin.initializeApp({
  projectId,
  ...(process.env.FIRESTORE_EMULATOR_HOST
    ? {}
    : { credential: admin.credential.applicationDefault() }),
});
const db = admin.firestore(),
  ts = admin.firestore.Timestamp.now();
const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
const entries = new Map();
function put(p, data) {
  entries.set(p, { ...(entries.get(p) || {}), ...data });
}
function publicOf(uid, u) {
  return {
    userId: uid,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
    biography: u.biography,
    followerCount: u.followerCount,
    followingCount: u.followingCount,
    active: u.active,
    updatedAt: ts,
  };
}
function encode(v) {
  if (v instanceof admin.firestore.Timestamp)
    return {
      __firestoreType: "timestamp",
      seconds: v.seconds,
      nanoseconds: v.nanoseconds,
    };
  if (v instanceof admin.firestore.GeoPoint)
    return {
      __firestoreType: "geopoint",
      latitude: v.latitude,
      longitude: v.longitude,
    };
  if (v instanceof admin.firestore.DocumentReference)
    return { __firestoreType: "reference", path: v.path };
  if (Buffer.isBuffer(v))
    return { __firestoreType: "bytes", value: v.toString("base64") };
  if (Array.isArray(v)) return v.map(encode);
  if (v && typeof v === "object")
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, encode(x)]),
    );
  return v;
}
async function main() {
  if (args.includes("--apply") && !args.includes("--backup-dir"))
    throw new Error("--apply bắt buộc --backup-dir đường_dẫn_ngoài_project");
  const [usersSnap, artistsSnap, songsSnap, albumsSnap] = await Promise.all(
    ["users", "artists", "songs", "albums"].map((c) => db.collection(c).get()),
  );
  const users = new Map(),
    artistMap = new Map(),
    albums = new Map(albumsSnap.docs.map((d) => [d.id, d.data()]));
  const publicIds = new Set();
  for (const d of usersSnap.docs) {
    const x = d.data();
    users.set(d.id, {
      userId: d.id,
      displayName: String(x.displayName || "Music lover"),
      email: String(x.email || ""),
      avatarUrl: String(x.avatarUrl ?? x.photoURL ?? ""),
      biography: String(x.biography || ""),
      createdAt: x.createdAt || ts,
      updatedAt: ts,
      followerCount: 0,
      followingCount: 0,
      active: x.active !== false,
    });
  }
  for (const d of artistsSnap.docs) {
    // Existing artist ID remains a stable user-profile ID. No fake Auth password/account is created.
    const uid = d.id,
      x = d.data();
    artistMap.set(d.id, uid);
    publicIds.add(uid);
    if (!users.has(uid))
      users.set(uid, {
        userId: uid,
        displayName: String(x.name || "Nghệ sĩ"),
        email: "",
        avatarUrl: String(x.imageUrl || ""),
        biography: String(x.biography || ""),
        createdAt: ts,
        updatedAt: ts,
        followerCount: 0,
        followingCount: 0,
        active: x.active !== false,
        legacyArtist: true,
      });
  }
  let nonAudio = 0,
    nonGenre = 0;
  for (const d of songsSnap.docs) {
    const x = d.data();
    let uid = artistMap.get(x.artistId) || x.artistId;
    const name = Array.isArray(x.artistNames)
      ? x.artistNames.join(", ")
      : String(x.artist || "Nghệ sĩ chưa rõ");
    if (!uid) uid = "legacy-" + hash(name);
    if (!users.has(uid))
      users.set(uid, {
        userId: uid,
        displayName: name,
        email: "",
        avatarUrl: "",
        biography: "",
        createdAt: ts,
        updatedAt: ts,
        followerCount: 0,
        followingCount: 0,
        active: true,
        legacyArtist: true,
      });
    publicIds.add(uid);
    let albumId = String(x.albumId || "");
    const albumTitle = String(x.albumTitle ?? x.album ?? "").trim();
    if (!albumId && albumTitle)
      albumId = "migrated-" + hash(uid + "\0" + albumTitle);
    if (albumId && !albums.has(albumId))
      albums.set(albumId, {
        albumId,
        title: albumTitle || "Album",
        artistId: uid,
        artistName: users.get(uid).displayName,
        coverUrl: String(x.coverUrl || ""),
        releaseDate: x.releaseDate || ts,
        isPublished: true,
        createdAt: ts,
      });
    const genre = (
      Array.isArray(x.genre)
        ? x.genre
        : typeof x.genre === "string"
          ? [x.genre]
          : ["Other"]
    )
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!x.genre) nonGenre++;
    if (!x.audioUrl) nonAudio++;
    const active = x.active !== false,
      visibility = x.visibility || "public";
    put(d.ref.path, {
      songId: d.id,
      title: String(x.title || "Chưa có tên"),
      artistId: uid,
      artistNames: Array.isArray(x.artistNames)
        ? x.artistNames
        : [users.get(uid).displayName],
      albumId,
      albumTitle,
      coverUrl: String(x.coverUrl ?? x.cover ?? ""),
      audioUrl: String(x.audioUrl || ""),
      audioKey: String(x.audioKey || ""),
      durationSeconds: Number(x.durationSeconds || 0),
      genre: genre.length ? genre : ["Other"],
      lyric: String(x.lyric ?? x.lyrics ?? ""),
      releaseDate: x.releaseDate || ts,
      isPublished: visibility === "public" && active,
      visibility,
      active,
      playCount: Math.max(0, Math.trunc(Number(x.playCount) || 0)),
      createdAt: x.createdAt || ts,
      updatedAt: ts,
    });
  }
  // Read all user subcollections before producing counters. Preserve links and timestamps.
  let splitPlaylists = 0;
  for (const d of usersSnap.docs) {
    const uid = d.id;
    const [following, favorites, playlists, history] = await Promise.all(
      ["following", "favorites", "playlists", "history"].map((c) =>
        d.ref.collection(c).get(),
      ),
    );
    for (const f of following.docs) {
      const target =
        artistMap.get(f.id) || f.data().userId || f.data().artistId || f.id;
      if (!users.has(target) || target === uid)
        throw new Error(
          `Following không hợp lệ: ${f.ref.path}. Sửa trước khi apply.`,
        );
      // IDs were preserved, so no relation document needs to be deleted/renamed.
      if (target !== f.id)
        throw new Error(
          `ID following khác target ở ${f.ref.path}; cần xử lý riêng.`,
        );
      users.get(uid).followingCount++;
      users.get(target).followerCount++;
      put(f.ref.path, {
        userId: target,
        followedAt: f.data().followedAt || ts,
      });
    }
    for (const f of favorites.docs)
      put(f.ref.path, {
        songId: f.id,
        favoritedAt: f.data().favoritedAt || ts,
      });
    for (const pl of playlists.docs) {
      const x = pl.data();
      const ids = [
        ...new Set(
          Array.isArray(x.songIds)
            ? x.songIds
            : Array.isArray(x.songs)
              ? x.songs.map((s) => s.songId)
              : [],
        ),
      ].filter((v) => typeof v === "string");
      const chunks = Array.from(
        { length: Math.max(1, Math.ceil(ids.length / 50)) },
        (_, i) => ids.slice(i * 50, (i + 1) * 50),
      );
      chunks.forEach((songIds, i) => {
        const ref = i ? `${pl.ref.path}-part-${i + 1}` : pl.ref.path;
        // A deterministic split path cannot silently overwrite an unrelated document.
        if (i && playlists.docs.some((p) => p.ref.path === ref))
          throw new Error(`Playlist split path đã có: ${ref}`);
        if (i) splitPlaylists++;
        put(ref, {
          userId: uid,
          name: String(x.name || "Playlist") + (i ? ` (${i + 1})` : ""),
          description: String(x.description || ""),
          visibility: "private",
          songIds,
          songCount: songIds.length,
          createdAt: x.createdAt || ts,
          updatedAt: ts,
        });
      });
    }
    // Normalize existing history without inventing counted plays; use at most 100 in UI.
    for (const h of history.docs) {
      const x = h.data();
      put(h.ref.path, {
        historyId: h.id,
        songId: String(x.songId || ""),
        playedAt: x.playedAt || ts,
        startedAt: x.startedAt || x.playedAt || ts,
        progressSeconds: Number(x.progressSeconds || 0),
        durationSeconds: Number(x.durationSeconds || 0),
        listenedSeconds: Number(x.listenedSeconds || 0),
        completed: x.completed === true,
        counted: x.counted === true,
      });
    }
  }
  for (const [uid, u] of users) {
    put(`users/${uid}`, u);
    put(`publicProfiles/${uid}`, publicOf(uid, u));
  }
  for (const [id, a] of albums) put(`albums/${id}`, { ...a, albumId: id });
  const marker = await db.doc("migrations/schema-v2").get();
  if (marker.exists)
    throw new Error(
      "Đã migrate v2. Không chạy lại để tránh ghi đè dữ liệu mới.",
    );
  console.log({
    projectId,
    users: users.size,
    songs: songsSnap.size,
    albums: albums.size,
    writes: entries.size,
    splitPlaylists,
    songsMissingAudioUrl: nonAudio,
    songsWithoutGenre: nonGenre,
  });
  console.log(
    "Không đổi ID songs/users/artists cũ; artists/charts cũ được giữ để rollback. Không tạo tài khoản Firebase Auth cho nghệ sĩ demo.",
  );
  if (!args.includes("--apply")) {
    console.log(
      "DRY RUN: chưa ghi dữ liệu. Kiểm tra số liệu rồi chạy lại với --apply --backup-dir ...",
    );
    return;
  }
  // Backup every document under affected roots, recursively, before the first write.
  const dir = path.resolve(option("--backup-dir"));
  fs.mkdirSync(dir, { recursive: true });
  const backup = [];
  async function walk(ref) {
    const snap = await ref.get();
    if (snap.exists) backup.push({ path: ref.path, data: encode(snap.data()) });
    for (const sub of await ref.listCollections())
      for (const child of await sub.listDocuments()) await walk(child);
  }
  for (const root of [
    "users",
    "publicProfiles",
    "artists",
    "songs",
    "albums",
    "charts",
    "migrations",
  ])
    for (const ref of await db.collection(root).listDocuments())
      await walk(ref);
  const file = path.join(dir, `schema-v2-backup-${Date.now()}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        projectId,
        createdAt: new Date().toISOString(),
        documents: backup,
        plannedPaths: [...entries.keys()],
      },
      null,
      2,
    ),
    { flag: "wx" },
  );
  console.log("Đã backup:", file);
  const planned = [...entries];
  for (let i = 0; i < planned.length; i += 350) {
    const b = db.batch();
    for (const [ref, data] of planned.slice(i, i + 350))
      b.set(db.doc(ref), data, { merge: true });
    await b.commit();
  }
  await db
    .doc("migrations/schema-v2")
    .set({
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      backup: file,
      writes: entries.size,
    });
  console.log(
    "Đã chuyển schema. Chưa deploy Rules. Giữ ứng dụng dừng cho đến khi đổi code + Rules xong.",
  );
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.terminate());
