// Node >=20. Run in tools. Admin key/state files stay outside project.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const { validate, dataset } = require("./dataset100/validate.cjs");
const argv = process.argv.slice(2),
  option = (name) => argv[argv.indexOf(name) + 1];
const apply = argv.includes("--confirm"),
  verifyOnly = argv.includes("--verify");
const counts = validate();
function output(value, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, file);
}
function cloudConfig() {
  const vars = { ...process.env };
  const file = path.resolve(__dirname, "../.env");
  if (fs.existsSync(file))
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(
        /^\s*(EXPO_PUBLIC_CLOUDINARY_(?:CLOUD_NAME|IMAGE_PRESET|AUDIO_PRESET))\s*=\s*(.*?)\s*$/,
      );
      if (m && !vars[m[1]]) vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  return {
    cloud: vars.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
    image: vars.EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET,
    video: vars.EXPO_PUBLIC_CLOUDINARY_AUDIO_PRESET,
  };
}
function digest() {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(dataset))
    .digest("hex");
}
function report(state) {
  const pub = dataset.songs.filter((s) => s.isPublished),
    rank = (a, b) =>
      b.playCount - a.playCount ||
      state.ids.songs[a.key].localeCompare(state.ids.songs[b.key]);
  const genres = [...new Set(pub.flatMap((s) => s.genre))].sort();
  const charts = Object.fromEntries(
    genres.map((g) => [
      g,
      pub
        .filter((s) => s.genre.includes(g))
        .sort(rank)
        .slice(0, 50)
        .map((s) => ({
          title: s.title,
          songId: state.ids.songs[s.key],
          playCount: s.playCount,
        })),
    ]),
  );
  const trending = dataset.albums
    .filter((a) => pub.some((song) => song.albumKey === a.key))
    .map((a) => ({
      title: a.title,
      albumId: state.ids.albums[a.key],
      totalPlayCount: pub
        .filter((s) => s.albumKey === a.key)
        .reduce((n, s) => n + s.playCount, 0),
    }))
    .sort(
      (a, b) =>
        b.totalPlayCount - a.totalPlayCount ||
        a.albumId.localeCompare(b.albumId),
    );
  const suggestions = Object.fromEntries(
    dataset.users
      .filter((u) => u.role === "listener")
      .map((u) => {
        const history = dataset.history
          .filter((h) => h.ownerKey === u.key)
          .sort((a, b) => a.minutesAgo - b.minutesAgo)
          .slice(0, 100);
        const recent = new Map(),
          weights = new Map();
        history.forEach((h, i) => {
          if (!recent.has(h.songKey)) recent.set(h.songKey, 100 - i);
          const song = pub.find((s) => s.key === h.songKey);
          if (song)
            for (const genre of song.genre)
              weights.set(genre, (weights.get(genre) || 0) + 100 - i);
        });
        const heard = pub
          .filter((s) => recent.has(s.key))
          .sort((a, b) => recent.get(b.key) - recent.get(a.key));
        const score = (s) =>
          s.genre.reduce((n, g) => n + (weights.get(g) || 0), 0);
        const related = pub
          .filter((s) => !recent.has(s.key))
          .sort((a, b) => score(b) - score(a) || rank(a, b));
        const result = heard.slice(0, 6);
        result.push(...related.slice(0, 12 - result.length));
        const keys = new Set(result.map((s) => s.key));
        result.push(
          ...heard.filter((s) => !keys.has(s.key)).slice(0, 12 - result.length),
        );
        return [
          u.key,
          result.map((song) => ({
            songId: state.ids.songs[song.key],
            title: song.title,
            genre: song.genre,
            reason: recent.has(song.key)
              ? "recent-history"
              : "genre-discovery-or-popularity",
          })),
        ];
      }),
  );
  return {
    projectId: state.projectId,
    runId: state.runId,
    counts,
    notice:
      "Expected ordering inside this fixture only. Existing songs/albums may appear between these entries. Counts are simulated QA baselines.",
    charts,
    trending,
    suggestions,
    privacy: dataset.songs
      .filter((s) => s.visibility !== "public")
      .map((s) => ({
        title: s.title,
        songId: state.ids.songs[s.key],
        artistUid: state.ids.users[s.artistKey],
        visibility: s.visibility,
        route: "/song?id=" + state.ids.songs[s.key],
      })),
    users: dataset.users.map((u) => ({
      key: u.key,
      displayName: u.displayName,
      uid: state.ids.users[u.key],
      email: state.accounts[u.key]?.email,
      historyCount: dataset.history.filter((h) => h.ownerKey === u.key).length,
      followingCount: dataset.following.filter((f) => f.ownerKey === u.key)
        .length,
      followerCount: dataset.following.filter((f) => f.targetKey === u.key)
        .length,
      followingUids: dataset.following
        .filter((f) => f.ownerKey === u.key)
        .map((f) => state.ids.users[f.targetKey]),
    })),
  };
}
async function main() {
  console.log("Kiểm tra dữ liệu:", counts);
  if (!apply && !verifyOnly) {
    console.log(
      "DRY RUN: chưa gọi Firebase/Cloudinary, chưa tạo ID hay tài khoản. Dùng --project PROJECT --state-file NGOAI_PROJECT.json --confirm để nhập.",
    );
    return;
  }
  const projectId = argv.includes("--project") ? option("--project") : "";
  const file = argv.includes("--state-file")
    ? path.resolve(option("--state-file"))
    : "";
  if (!projectId || projectId.startsWith("--") || !file)
    throw new Error(
      "Cần --project PROJECT --state-file FILE_NGOAI_PROJECT.json",
    );
  const projectRoot = path.resolve(__dirname, "..");
  if (file === projectRoot || file.startsWith(projectRoot + path.sep))
    throw new Error(
      "State chứa thông tin tài khoản; đặt ngoài project, ví dụ D:\\React_Native\\firebase\\qa100-state.json",
    );
  const emulator =
    !!process.env.FIRESTORE_EMULATOR_HOST &&
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (
    !!process.env.FIRESTORE_EMULATOR_HOST !==
    !!process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw new Error(
      "Phải dùng đồng thời Auth và Firestore emulator, hoặc tắt cả hai.",
    );
  if (argv.includes("--emulator-media") && !emulator)
    throw new Error(
      "--emulator-media chỉ dùng cho test tự động trên emulator.",
    );
  if (!emulator && !process.env.GOOGLE_APPLICATION_CREDENTIALS)
    throw new Error(
      "Cần GOOGLE_APPLICATION_CREDENTIALS trỏ tới khóa Admin ngoài project.",
    );
  const admin = require("firebase-admin");
  admin.initializeApp({
    projectId,
    ...(emulator ? {} : { credential: admin.credential.applicationDefault() }),
  });
  const db = admin.firestore(),
    auth = admin.auth();
  let locked = false;
  try {
    if (verifyOnly) {
      if (!fs.existsSync(file)) throw new Error("Không tìm thấy state file.");
      const state = JSON.parse(fs.readFileSync(file, "utf8"));
      if (state.projectId !== projectId || state.digest !== digest())
        throw new Error("Project hoặc dataset không khớp state.");
      await verify(db, auth, state);
      return;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const lock = file + ".lock";
    fs.writeFileSync(lock, String(process.pid), { flag: "wx" });
    locked = true;
    let state;
    if (fs.existsSync(file)) {
      state = JSON.parse(fs.readFileSync(file, "utf8"));
      if (state.projectId !== projectId || state.digest !== digest())
        throw new Error(
          "State không khớp project/dataset. Dùng state file mới nếu muốn tạo một bộ dữ liệu mới.",
        );
      if (state.status === "complete") {
        console.log(
          "Bộ này đã nhập. Không tạo trùng và không reset số đếm. Chạy --verify nếu muốn kiểm tra.",
        );
        return;
      }
    } else {
      const runId = db.collection("testDatasets").doc().id;
      state = {
        version: 2,
        projectId,
        runId,
        startedAt: Date.now(),
        digest: digest(),
        status: "preparing",
        ids: { users: {}, albums: {}, songs: {}, playlists: {}, history: {} },
        accounts: {},
        media: {},
      };
      output(state, file);
    }
    const save = () => output(state, file);
    console.log("Project đích:", projectId, "Run:", state.runId);
    const cfg = cloudConfig();
    if (
      !argv.includes("--emulator-media") &&
      (!cfg.cloud || !cfg.image || !cfg.video)
    )
      throw new Error(
        "Thiếu 3 biến Cloudinary trong .env gốc hoặc biến môi trường.",
      );
    // Upload just 3 audio files + 25 covers; all 100 songs reuse the test tracks.
    for (const m of dataset.media) {
      if (state.media[m.key]) continue;
      if (argv.includes("--emulator-media"))
        state.media[m.key] = {
          url: "https://fixture.invalid/" + m.key,
          duration: m.durationSeconds || 0,
        };
      else {
        const filename = path.join(__dirname, "dataset100", m.file),
          form = new FormData();
        form.append(
          "file",
          new Blob([fs.readFileSync(filename)], { type: m.mimeType }),
          path.basename(filename),
        );
        form.append("upload_preset", cfg[m.kind]);
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cfg.cloud}/${m.kind}/upload`,
          { method: "POST", body: form, signal: AbortSignal.timeout(120000) },
        );
        const body = await response.json();
        if (!response.ok || !body.secure_url)
          throw new Error(
            "Cloudinary: " + (body.error?.message || response.status),
          );
        if (
          m.kind === "video" &&
          (!Number.isFinite(body.duration) ||
            Math.abs(body.duration - m.durationSeconds) > 1)
        )
          throw new Error("Thời lượng audio upload không khớp file kiểm thử.");
        state.media[m.key] = {
          url: body.secure_url,
          duration: body.duration || 0,
          publicId: body.public_id,
          resourceType: m.kind,
        };
      }
      save();
      console.log("Đã chuẩn bị media:", m.key);
    }
    // Auth generates UID. Passwords are random per account; never stored in source or Firestore.
    for (const u of dataset.users) {
      if (state.ids.users[u.key]) continue;
      if (!state.accounts[u.key]) {
        state.accounts[u.key] = {
          email: u.email.replace("{run}", state.runId.toLowerCase()),
          password: crypto.randomBytes(18).toString("base64url"),
        };
        save();
      }
      const account = state.accounts[u.key];
      let existing;
      try {
        existing = await auth.getUserByEmail(account.email);
      } catch (e) {
        if (e.code !== "auth/user-not-found") throw e;
      }
      if (existing) {
        if (
          !account.attemptedAt ||
          Date.parse(existing.metadata.creationTime) <
            account.attemptedAt - 5000
        )
          throw new Error(
            "Email đã tồn tại ngoài lần seed này. Không ghi đè tài khoản.",
          );
      } else {
        account.attemptedAt = Date.now();
        save();
        existing = await auth.createUser({
          email: account.email,
          password: account.password,
          displayName: u.displayName,
          photoURL: state.media[u.avatarMediaKey].url,
          emailVerified: true,
          disabled: true,
        });
      }
      state.ids.users[u.key] = existing.uid;
      save();
    }
    for (const [kind, items, collectionName] of [
      ["albums", dataset.albums, "albums"],
      ["songs", dataset.songs, "songs"],
    ])
      for (const x of items)
        if (!state.ids[kind][x.key])
          state.ids[kind][x.key] = db.collection(collectionName).doc().id;
    for (const [kind, items] of [
      ["playlists", dataset.playlists],
      ["history", dataset.history],
    ])
      for (const x of items)
        if (!state.ids[kind][x.key])
          state.ids[kind][x.key] = db
            .collection("users")
            .doc(state.ids.users[x.ownerKey])
            .collection(kind)
            .doc().id;
    save();
    const base = state.startedAt,
      ts = (offset) => admin.firestore.Timestamp.fromMillis(base + offset),
      now = ts(0);
    const documents = [],
      ids = state.ids;
    const add = (path, data) => documents.push({ path, data });
    const followerCount = (key) =>
      dataset.following.filter((f) => f.targetKey === key).length;
    const followingCount = (key) =>
      dataset.following.filter((f) => f.ownerKey === key).length;
    for (const u of dataset.users) {
      const uid = ids.users[u.key],
        profile = {
          userId: uid,
          displayName: u.displayName,
          avatarUrl: state.media[u.avatarMediaKey].url,
          biography: u.biography,
          followerCount: followerCount(u.key),
          followingCount: followingCount(u.key),
          active: true,
          updatedAt: now,
        };
      add("users/" + uid, {
        ...profile,
        email: state.accounts[u.key].email,
        createdAt: ts(-30 * 86400000),
      });
    }
    for (const a of dataset.albums)
      add("albums/" + ids.albums[a.key], {
        albumId: ids.albums[a.key],
        title: a.title,
        artistId: ids.users[a.artistKey],
        artistName: a.artistName,
        coverUrl: state.media[a.coverMediaKey].url,
        releaseDate: ts(-20 * 86400000),
        isPublished: a.isPublished,
        createdAt: ts(-20 * 86400000),
      });
    for (const s of dataset.songs)
      add("songs/" + ids.songs[s.key], {
        songId: ids.songs[s.key],
        title: s.title,
        artistId: ids.users[s.artistKey],
        artistNames: s.artistNames,
        albumId: ids.albums[s.albumKey],
        albumTitle: dataset.albums.find((a) => a.key === s.albumKey).title,
        coverUrl: state.media[s.coverMediaKey].url,
        audioUrl: state.media[s.audioMediaKey].url,
        audioKey: "",
        durationSeconds: s.durationSeconds,
        genre: s.genre,
        lyric: s.lyric,
        releaseDate: ts(-19 * 86400000),
        isPublished: s.isPublished,
        visibility: s.visibility,
        active: s.active,
        playCount: s.playCount,
        createdAt: ts(-19 * 86400000),
        updatedAt: now,
      });
    for (const p of dataset.playlists)
      add(`users/${ids.users[p.ownerKey]}/playlists/${ids.playlists[p.key]}`, {
        userId: ids.users[p.ownerKey],
        name: p.name,
        description: p.description,
        visibility: p.visibility,
        songIds: p.songKeys.map((k) => ids.songs[k]),
        songCount: p.songCount,
        createdAt: ts(-3 * 86400000),
        updatedAt: now,
      });
    for (const f of dataset.following)
      add(
        `users/${ids.users[f.ownerKey]}/following/${ids.users[f.targetKey]}`,
        { userId: ids.users[f.targetKey], followedAt: ts(-5 * 86400000) },
      );
    for (const f of dataset.favorites)
      add(`users/${ids.users[f.ownerKey]}/favorites/${ids.songs[f.songKey]}`, {
        songId: ids.songs[f.songKey],
        favoritedAt: ts(-2 * 86400000),
      });
    const receipts = new Map();
    for (const h of dataset.history) {
      const playedAt = ts(-h.minutesAgo * 60000),
        id = ids.history[h.key],
        uid = ids.users[h.ownerKey],
        songId = ids.songs[h.songKey];
      add(`users/${uid}/history/${id}`, {
        historyId: id,
        songId,
        playedAt,
        startedAt: ts(-h.minutesAgo * 60000 - h.listenedSeconds * 1000),
        progressSeconds: h.progressSeconds,
        durationSeconds: h.durationSeconds,
        completed: h.completed,
        listenedSeconds: h.listenedSeconds,
        counted: h.counted,
      });
      const path = `users/${uid}/playReceipts/${songId}`;
      const previous = receipts.get(path);
      if (
        h.counted &&
        (!previous || previous.countedAt.toMillis() < playedAt.toMillis())
      )
        receipts.set(path, { historyId: id, countedAt: playedAt });
    }
    for (const [path, data] of receipts) add(path, data);
    // create() never overwrites documents, even when resuming a partial run.
    state.status = "writing";
    state.paths = documents.map((d) => d.path);
    save();
    let created = 0,
      skipped = 0;
    for (let i = 0; i < documents.length; i += 200) {
      const group = documents.slice(i, i + 200),
        existing = await db.getAll(...group.map((x) => db.doc(x.path))),
        batch = db.batch();
      group.forEach((x, j) => {
        if (existing[j].exists) {
          skipped++;
          return;
        }
        batch.create(db.doc(x.path), x.data);
        created++;
      });
      await batch.commit();
    }
    for (const uid of Object.values(ids.users))
      await auth.updateUser(uid, { disabled: false });
    state.completedAt = Date.now();
    await db.doc("testDatasets/" + state.runId).set({
      createdAt: now,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      counts,
      ids,
      fixtureType: "synthetic-qa",
      digest: state.digest,
    });
    const credentialsFile = path.join(
      path.dirname(file),
      `qa100-${state.runId}-accounts.json`,
    );
    output(
      {
        projectId,
        runId: state.runId,
        accounts: dataset.users.map((u) => ({
          key: u.key,
          displayName: u.displayName,
          uid: ids.users[u.key],
          ...state.accounts[u.key],
        })),
      },
      credentialsFile,
    );
    const reportFile = path.join(
      path.dirname(file),
      `qa100-${state.runId}-expected.json`,
    );
    output(report(state), reportFile);
    const resolvedFile = path.join(
      path.dirname(file),
      `qa100-${state.runId}-resolved.json`,
    );
    output(
      {
        projectId,
        runId: state.runId,
        notice:
          "JSON snapshot for inspection. Actual Firestore timestamp fields are native Timestamp, not strings.",
        documents,
      },
      resolvedFile,
    );
    state.status = "complete";
    save();
    console.log("Hoàn tất:", {
      created,
      skipped,
      users: 25,
      songs: 100,
      albums: 20,
    });
    console.log("Thông tin đăng nhập (không push Git):", credentialsFile);
    console.log("ID/link và kết quả mong đợi:", reportFile);
    console.log("Snapshot dữ liệu có ID thật:", resolvedFile);
    console.log("State dùng lại khi --verify hoặc resume:", file);
  } finally {
    if (locked) fs.unlinkSync(file + ".lock");
    await db.terminate();
    await admin.app().delete();
  }
}
async function verify(db, auth, state) {
  if (state.status !== "complete")
    throw new Error(
      "Seed chưa hoàn tất. Chạy lại --confirm với cùng state để resume.",
    );
  const docs = new Map();
  const paths = state.paths.filter(p => !p.startsWith("publicProfiles/"));
  for (let i = 0; i < paths.length; i += 200)
    for (const s of await db.getAll(
      ...paths.slice(i, i + 200).map((p) => db.doc(p)),
    )) {
      if (!s.exists) throw new Error("Thiếu document: " + s.ref.path);
      docs.set(s.ref.path, s.data());
    }
  for (const u of dataset.users) {
    const uid = state.ids.users[u.key],
      privateUser = docs.get("users/" + uid);
    if (privateUser.userId !== uid || typeof privateUser.email !== "string")
      throw new Error("Sai user/profile " + u.key);
    await auth.getUser(uid);
  }
  for (const s of dataset.songs) {
    const x = docs.get("songs/" + state.ids.songs[s.key]);
    if (
      x.songId !== state.ids.songs[s.key] ||
      x.artistId !== state.ids.users[s.artistKey] ||
      x.albumId !== state.ids.albums[s.albumKey]
    )
      throw new Error("Sai quan hệ " + s.key);
  }
  for (const p of dataset.playlists) {
    const x = docs.get(
      `users/${state.ids.users[p.ownerKey]}/playlists/${state.ids.playlists[p.key]}`,
    );
    if (x.songCount !== x.songIds.length || x.songCount > 50)
      throw new Error("Sai playlist " + p.key);
  }
  console.log(
    "VERIFY PASS: đủ document, Auth users, quan hệ user/song/album/playlist và profile không chứa email.",
  );
  console.log(
    "Sau khi bạn tương tác, counters/history có thể thay đổi hợp lệ; verifier không reset chúng.",
  );
}
if (require.main === module)
  main().catch((e) => {
    console.error("Không nhập được dữ liệu:", e.message);
    process.exitCode = 1;
  });
module.exports = { report, main };
