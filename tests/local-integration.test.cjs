require("./helpers/register-local.cjs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const { seedLocal } = require("../tools/local/seed.cjs");
const { localEnvironment } = require("../tools/local/environment.cjs");
const { PASSWORD } = require("../tools/local/fixtures.cjs");
const { createLocalBackend } = require("../tools/local/backend.cjs");
const { signInWithEmailAndPassword, signOut } = require("firebase/auth");
const {
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  orderBy,
  limit,
  terminate,
  updateDoc,
} = require("firebase/firestore");
const { deleteApp, getApps } = require("firebase/app");

let server, base, auth, db, getFirebaseAuth, getFirebaseDb;
before(async () => {
  // Never run this suite with an implicit cloud or absent emulator configuration.
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Use npm run test:local:integration",
  );
  assert.ok(
    process.env.FIREBASE_AUTH_EMULATOR_HOST,
    "Use npm run test:local:integration",
  );
  const env = localEnvironment();
  Object.assign(process.env, env, {
    EXPO_PUBLIC_FIREBASE_MODE: "emulator",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: "demo-music-stream",
    EXPO_PUBLIC_EMULATOR_HOST: "127.0.0.1",
    EXPO_PUBLIC_AUTH_EMULATOR_PORT:
      env.FIREBASE_AUTH_EMULATOR_HOST.split(":")[1],
    EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT:
      env.FIRESTORE_EMULATOR_HOST.split(":")[1],
    EXPO_PUBLIC_BACKEND_URL: "http://127.0.0.1:8787",
  });
  await seedLocal();
  ({ getFirebaseAuth } = require("../src/services/firebase/auth.web.ts"));
  ({ getFirebaseDb } = require("../src/services/firebase/firestore.ts"));
  auth = getFirebaseAuth();
  db = getFirebaseDb();
  server = await createLocalBackend();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.EXPO_PUBLIC_BACKEND_URL = base;
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  if (auth) await signOut(auth);
  if (db) await terminate(db);
  await Promise.all(getApps().map(deleteApp));
  const admin = require("node:module").createRequire(
    require.resolve("../tools/package.json"),
  )("firebase-admin/app");
  await Promise.all(admin.getApps().map(admin.deleteApp));
});

test("app getters connect once to demo emulators; guest cannot read the catalog", async () => {
  assert.equal(getFirebaseAuth(), auth);
  assert.equal(getFirebaseDb(), db);
  assert.equal(auth.app.options.projectId, "demo-music-stream");
  assert.equal(
    auth.emulatorConfig.port,
    Number(process.env.FIREBASE_AUTH_EMULATOR_HOST.split(":")[1]),
  );
  await assert.rejects(getDoc(doc(db, "songs/local-song-000")), {
    code: "permission-denied",
  });
});

test("M2 history reopens validate live existence and permissions for all three kinds", async () => {
  const {
    validateSearchHistoryItem,
  } = require("../src/services/searchHistoryAccess.ts");
  const item = (kind, id) => ({
    kind,
    id,
    title: "Cached label",
    subtitle: "",
  });
  assert.equal(
    await validateSearchHistoryItem(
      item("song", "local-song-000"),
      "local-listener",
    ),
    false,
  );
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  assert.equal(
    await validateSearchHistoryItem(
      item("song", "local-song-000"),
      "local-listener",
    ),
    true,
  );
  assert.equal(
    await validateSearchHistoryItem(
      item("album", "local-album-0"),
      "local-listener",
    ),
    true,
  );
  assert.equal(
    await validateSearchHistoryItem(
      item("artist", "local-artist-01"),
      "local-listener",
    ),
    true,
  );
  assert.equal(
    await validateSearchHistoryItem(
      item("artist", "missing-profile"),
      "local-listener",
    ),
    false,
  );
  assert.equal(
    await validateSearchHistoryItem(
      item("song", "local-song-000"),
      "local-member",
    ),
    false,
  );
  assert.equal(
    await validateSearchHistoryItem(
      item("song", "local-private"),
      "local-listener",
    ),
    false,
  );
  // Even if an earlier read put media metadata in the SDK cache, a fresh server
  // read must reject access after the owner changes visibility.
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = adminDb.doc("songs/local-song-000");
  const original = (await ref.get()).data();
  try {
    await ref.update({ isPublic: false });
    assert.equal(
      await validateSearchHistoryItem(
        item("song", "local-song-000"),
        "local-listener",
      ),
      false,
    );
    await ref.update({ isPublic: original.isPublic, active: false });
    assert.equal(
      await validateSearchHistoryItem(
        item("song", "local-song-000"),
        "local-listener",
      ),
      false,
    );
  } finally {
    await ref.set(original);
    await signOut(auth);
  }
});

test("local login, catalog/history, visibility and authenticated Node round trip work with real rules", async () => {
  const result = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  await assert.rejects(
    getDocs(
      query(
        collection(db, "songs"),
        where("isPublic", "==", "public"),
        where("active", "==", true),
      ),
    ),
    { code: "permission-denied" },
  );
  // Even signed users must use the API for public data.
  await assert.rejects(
    getDocs(
      query(
        collection(db, "users/local-listener/history"),
        orderBy("playedAt", "desc"),
        limit(100),
      ),
    ),
    { code: "permission-denied" },
  );
  await assert.rejects(getDoc(doc(db, "songs/local-private")), {
    code: "permission-denied",
  });
  await assert.rejects(getDoc(doc(db, "songs/local-followers")), {
    code: "permission-denied",
  });
  assert.equal((await listenerRequest("/catalog/public-songs")).status, 200);
  const recentHistory = await listenerRequest("/recent-history");
  assert.equal(recentHistory.status, 200);
  const history = await recentHistory.json();
  assert.equal(history.items.length, 100);
  assert.equal(new Set(history.items.map((item) => item.songId)).size, 80);
  assert.equal((await listenerRequest("/songs/local-followers")).status, 403);
  await assert.rejects(getDoc(doc(db, "users/local-artist-01/history/other")), {
    code: "permission-denied",
  });
  assert.equal((await fetch(`${base}/session`)).status, 401);
  assert.equal(
    (
      await fetch(`${base}/session`, {
        headers: { Authorization: "Bearer invalid" },
      })
    ).status,
    401,
  );
  const response = await fetch(`${base}/session`, {
    headers: { Authorization: `Bearer ${await result.user.getIdToken()}` },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    uid: "local-listener",
    displayName: "Người nghe local",
  });
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.projectId, "demo-music-stream");
});

test("profile bootstrap creates once from Auth, ignores forged fields and never revives inactive accounts", async () => {
  const { db: serverDb, auth: serverAuth } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const uid = "bootstrap-check";
  await serverAuth.createUser({
    uid,
    email: "bootstrap-check@example.test",
    password: PASSWORD,
    displayName: "Bootstrap user",
  });
  const ref = serverDb.doc(`users/${uid}`);
  try {
    const login = await signInWithEmailAndPassword(
      auth,
      "bootstrap-check@example.test",
      PASSWORD,
    );
    const headers = {
      Authorization: `Bearer ${await login.user.getIdToken()}`,
      "Content-Type": "application/json",
    };
    const ensure = () =>
      fetch(`${base}/me/ensure?uid=local-member`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          active: false,
          followerCount: 999,
          email: "forged@example.test",
        }),
      });
    assert.equal(
      (await fetch(`${base}/me/ensure`, { method: "POST" })).status,
      401,
    );
    const responses = await Promise.all([ensure(), ensure(), ensure()]);
    assert.ok(responses.every((response) => response.status === 200));
    const original = (await ref.get()).data();
    assert.equal(original.userId, undefined);
    assert.equal(original.email, "bootstrap-check@example.test");
    assert.equal(original.displayName, "Bootstrap user");
    assert.equal(original.active, true);
    assert.equal(original.followerCount, 0);
    await ref.update({
      biography: "Keep biography",
      displayName: "Edited profile",
    });
    await serverAuth.updateUser(uid, { displayName: "Changed Auth" });
    assert.equal((await ensure()).status, 200);
    const retained = (await ref.get()).data();
    assert.equal(retained.displayName, "Edited profile");
    assert.equal(retained.biography, "Keep biography");
    assert.equal(retained.createdAt.toMillis(), original.createdAt.toMillis());
    await ref.update({ active: false });
    assert.equal((await ensure()).status, 403);
    assert.equal((await ref.get()).data().active, false);
    await ref.update({ active: true });
    await serverAuth.updateUser(uid, { disabled: true });
    // Firebase rejects the disabled account's token before the route runs.
    assert.equal((await ensure()).status, 401);
  } finally {
    await ref.delete();
    await serverDb.doc(`publicProfiles/${uid}`).delete();
    await serverAuth.deleteUser(uid);
    await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
  }
});

test("profile API whitelists own DTO and updates metadata without accepting privilege fields", async () => {
  assert.equal((await fetch(`${base}/me`)).status, 401);
  const result = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await result.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = adminDb.doc(`users/${result.user.uid}`);
  const original = (await ref.get()).data();
  const own = await (
    await fetch(`${base}/me?uid=local-member`, { headers })
  ).json();
  const publicResponse = await fetch(`${base}/profiles/local-listener`, {
    headers,
  });
  assert.equal(publicResponse.status, 200);
  const publicProfile = await publicResponse.json();
  assert.equal(publicProfile.id, result.user.uid);
  assert.doesNotMatch(JSON.stringify(publicProfile), /email|@example|password/);
  assert.equal(
    (await fetch(`${base}/profiles/missing-profile`, { headers })).status,
    404,
  );
  assert.equal(own.userId, result.user.uid);
  assert.equal(own.email, result.user.email);
  assert.deepEqual(
    Object.keys(own).sort(),
    [
      "userId",
      "email",
      "displayName",
      "avatarUrl",
      "biography",
      "followerCount",
      "followingCount",
    ].sort(),
  );
  const fields = {
    displayName: "Tên hồ sơ mới",
    avatarUrl: "https://example.test/avatar.jpg",
    biography: "Tiểu sử thử nghiệm",
  };
  const patch = (value) =>
    fetch(`${base}/me`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(value),
    });
  try {
    assert.equal((await patch({ ...fields, active: false })).status, 400);
    assert.equal((await patch({ ...fields, followerCount: 999 })).status, 400);
    assert.equal(
      (await patch({ ...fields, avatarUrl: "http://example.test/a" })).status,
      400,
    );
    assert.equal((await patch(fields)).status, 200);
    const saved = (await ref.get()).data();
    assert.equal(saved.biography, fields.biography);
    assert.equal(saved.email, original.email);
    assert.equal(saved.active, original.active);
    await ref.update({ active: false });
    assert.equal((await patch(fields)).status, 403);
  } finally {
    await ref.update({
      displayName: original.displayName,
      avatarUrl: original.avatarUrl,
      biography: original.biography,
      active: original.active,
    });
  }
});

test("album API creates metadata, saves public state and description, and rejects non-owner writes", async () => {
  const owner = await signInWithEmailAndPassword(
    auth,
    "local-artist-01@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await owner.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const fields = {
    title: "Album API kiểm thử",
    description: "Mô tả album",
    coverUrl: "https://example.test/album.jpg",
    isPublic: false,
  };
  const post = (value) =>
    fetch(`${base}/albums`, {
      method: "POST",
      headers,
      body: JSON.stringify(value),
    });
  assert.equal(
    (await post({ ...fields, artistId: "local-member" })).status,
    400,
  );
  assert.equal(
    (await post({ ...fields, coverUrl: "http://example.test/cover" })).status,
    400,
  );
  const created = await post(fields);
  assert.equal(created.status, 201);
  const album = await created.json();
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = adminDb.doc(`albums/${album.id}`);
  try {
    assert.equal(album.artistId, "local-artist-01");
    const initial = (await ref.get()).data();
    assert.equal(initial.isPublic, false);
    assert.equal(initial.isPublic, false);
    assert.equal(initial.description, fields.description);
    const privateInfo = await fetch(`${base}/my-album-info?id=${album.id}`, {
      headers,
    });
    assert.equal(privateInfo.status, 200);
    assert.equal((await privateInfo.json()).album.isPublic, false);
    const listing = await (
      await fetch(`${base}/my-albums`, { headers })
    ).json();
    assert.ok(
      listing.items.every((row) => row.item.artistId === "local-artist-01"),
    );
    const changed = { ...fields, title: "Đổi tên album", isPublic: true };
    assert.equal(
      (
        await fetch(`${base}/albums/${album.id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(changed),
        })
      ).status,
      200,
    );
    const updated = (await ref.get()).data();
    assert.equal(updated.isPublic, true);
    assert.equal(updated.isPublic, true);
    assert.equal(updated.createdAt.toMillis(), initial.createdAt.toMillis());
    const other = await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
    const otherHeaders = {
      Authorization: `Bearer ${await other.user.getIdToken()}`,
    };
    assert.equal(
      (
        await fetch(`${base}/my-album-info?id=${album.id}`, {
          headers: otherHeaders,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/uploads?albumId=${album.id}`, {
          headers: otherHeaders,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(`${base}/albums/${album.id}`, {
          method: "PATCH",
          headers: {
            ...headers,
            Authorization: `Bearer ${await other.user.getIdToken()}`,
          },
          body: JSON.stringify(changed),
        })
      ).status,
      403,
    );
    assert.equal((await ref.get()).data().artistId, "local-artist-01");
  } finally {
    await ref.delete();
  }
});

test("album membership allows only own unassigned songs, resolves concurrent adds and preserves songs on removal", async () => {
  const owner = await signInWithEmailAndPassword(
    auth,
    "local-artist-01@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await owner.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const source = await adminDb
    .collection("songs")
    .where("artistId", "==", "local-artist-01")
    .limit(1)
    .get();
  const songRef = adminDb.collection("songs").doc();
  const original = {
    ...source.docs[0].data(),
    title: `Unassigned ${songRef.id}`,
    songId: songRef.id,
    albumId: "",
  };
  const albumIds = [];
  try {
    await songRef.set(original);
    for (let i = 0; i < 2; i++) {
      const response = await fetch(`${base}/albums`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          title: `Membership ${i}`,
          description: "",
          coverUrl: "",
          isPublic: false,
        }),
      });
      assert.equal(response.status, 201);
      albumIds.push((await response.json()).id);
    }
    const change = (id, method, useHeaders = headers) =>
      fetch(`${base}/albums/${id}/songs/${songRef.id}`, {
        method,
        headers: useHeaders,
      });
    const unassignedUrl = `${base}/uploads?unassigned=1&q=${encodeURIComponent(original.title)}`;
    let available = [];
    for (let attempt = 0; attempt < 20; attempt++) {
      available = (await (await fetch(unassignedUrl, { headers })).json())
        .items;
      if (available?.length) break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    assert.deepEqual(
      available.map((row) => row.item.id),
      [songRef.id],
    );
    assert.equal(
      (
        await fetch(`${base}/uploads?unassigned=1&albumId=${albumIds[0]}`, {
          headers,
        })
      ).status,
      400,
    );
    const concurrent = await Promise.all(
      albumIds.map((id) => change(id, "PUT")),
    );
    assert.deepEqual(
      concurrent.map((response) => response.status).sort(),
      [200, 409],
    );
    const assigned = (await songRef.get()).data().albumId;
    assert.ok(albumIds.includes(assigned));
    assert.deepEqual(
      (await (await fetch(unassignedUrl, { headers })).json()).items,
      [],
    );
    assert.equal((await change(assigned, "PUT")).status, 200); // Idempotent retry.
    const otherAlbum = albumIds.find((id) => id !== assigned);
    assert.equal((await change(otherAlbum, "DELETE")).status, 409);
    const other = await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
    assert.equal(
      (
        await change(assigned, "DELETE", {
          Authorization: `Bearer ${await other.user.getIdToken()}`,
        })
      ).status,
      403,
    );
    assert.equal((await change(assigned, "DELETE")).status, 200);
    assert.equal((await change(assigned, "DELETE")).status, 200);
    const remaining = (await songRef.get()).data();
    assert.equal(remaining.albumId, null);
    assert.equal(remaining.albumTitle, undefined);
    for (const key of [
      "title",
      "audioUrl",
      "audioPublicId",
      "active",
      "isPublic",
      "playCount",
    ])
      assert.deepEqual(remaining[key], original[key]);
  } finally {
    await songRef.delete();
    await Promise.all(
      albumIds.map((id) => adminDb.doc(`albums/${id}`).delete()),
    );
  }
});

test("album deletion detaches multiple batches, preserves songs and is idempotent", async () => {
  const owner = await signInWithEmailAndPassword(
    auth,
    "local-artist-02@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await owner.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const created = await fetch(`${base}/albums`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: "Delete multi batch",
      description: "",
      coverUrl: "",
      isPublic: true,
    }),
  });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const source = await adminDb
    .collection("songs")
    .where("artistId", "==", "local-artist-02")
    .limit(1)
    .get();
  const original = source.docs[0].data();
  const refs = Array.from({ length: 105 }, () =>
    adminDb.collection("songs").doc(),
  );
  try {
    const batch = adminDb.batch();
    for (const ref of refs)
      batch.set(ref, {
        ...original,
        songId: ref.id,
        albumId: id,
      });
    await batch.commit();
    const other = await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
    assert.equal(
      (
        await fetch(`${base}/albums/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${await other.user.getIdToken()}` },
        })
      ).status,
      403,
    );
    assert.equal(
      (await fetch(`${base}/albums/${id}`, { method: "DELETE", headers }))
        .status,
      200,
    );
    assert.equal((await adminDb.doc(`albums/${id}`).get()).exists, false);
    const retained = await adminDb.getAll(...refs);
    assert.ok(
      retained.every(
        (song) =>
          song.exists &&
          song.data().albumId === null &&
          song.data().albumTitle === undefined,
      ),
    );
    for (const song of retained)
      for (const key of ["audioUrl", "active", "isPublic", "playCount"])
        assert.deepEqual(song.data()[key], original[key]);
    assert.equal(
      (await fetch(`${base}/albums/${id}`, { method: "DELETE", headers }))
        .status,
      200,
    );
  } finally {
    const cleanup = adminDb.batch();
    refs.forEach((ref) => cleanup.delete(ref));
    cleanup.delete(adminDb.doc(`albums/${id}`));
    await cleanup.commit();
  }
});

test("album favorites are idempotent, private per user and revalidate album visibility", async () => {
  const listener = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await listener.user.getIdToken()}`,
  };
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const album = adminDb.collection("albums").doc();
  const favorite = adminDb.doc(
    `users/local-listener/favoriteAlbums/${album.id}`,
  );
  try {
    await album.set({
      title: "Favorite lifecycle",
      artistId: "local-artist-03",
      coverUrl: "",
      isPublic: true,
      isPublic: true,
    });
    const url = `${base}/favorite-albums/${album.id}`;
    assert.equal((await fetch(url, { method: "PUT", headers })).status, 200);
    const timestamp = (await favorite.get()).data().favoritedAt.toMillis();
    assert.equal((await fetch(url, { method: "PUT", headers })).status, 200);
    assert.equal(
      (await favorite.get()).data().favoritedAt.toMillis(),
      timestamp,
    );
    const body = await (
      await fetch(`${base}/favorite-albums?uid=local-member`, { headers })
    ).json();
    assert.ok(body.albums.some((row) => row.id === album.id));
    assert.ok(body.albums.every((row) => !("email" in row)));
    await album.update({ isPublic: false, isPublished: false });
    assert.ok(
      !(
        await (await fetch(`${base}/favorite-albums`, { headers })).json()
      ).albums.some((row) => row.id === album.id),
    );
    assert.equal((await fetch(url, { method: "PUT", headers })).status, 403);
    assert.equal((await fetch(url, { method: "DELETE", headers })).status, 200);
    assert.equal((await favorite.get()).exists, false);
    assert.equal((await fetch(url, { method: "DELETE", headers })).status, 200);
    const owner = await signInWithEmailAndPassword(
      auth,
      "local-artist-03@example.test",
      PASSWORD,
    );
    const ownerHeaders = {
      Authorization: `Bearer ${await owner.user.getIdToken()}`,
    };
    assert.equal(
      (await fetch(url, { method: "PUT", headers: ownerHeaders })).status,
      200,
    );
    assert.ok(
      (
        await (
          await fetch(`${base}/favorite-albums`, { headers: ownerHeaders })
        ).json()
      ).albums.some((row) => row.id === album.id),
    );
    assert.equal((await favorite.get()).exists, false);
  } finally {
    await Promise.all([
      album.delete(),
      favorite.delete(),
      adminDb.doc(`users/local-artist-03/favoriteAlbums/${album.id}`).delete(),
    ]);
  }
});

test("playlist API owns CRUD, public metadata and atomic membership with permission and size checks", async () => {
  const user = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await user.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const fields = {
    name: "API Playlist",
    description: "Mô tả",
    isPublic: false,
  };
  const create = await fetch(`${base}/playlists`, {
    method: "POST",
    headers,
    body: JSON.stringify(fields),
  });
  assert.equal(create.status, 201);
  const { id } = await create.json();
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = adminDb.doc(`users/local-listener/playlists/${id}`);
  const songUrl = `${base}/playlists/${id}/songs/local-song-000`;
  try {
    const ownList = await (
      await fetch(`${base}/my-playlists?uid=local-member`, { headers })
    ).json();
    assert.ok(
      ownList.items.some((item) => item.id === id && item.isPublic === false),
    );
    assert.doesNotMatch(JSON.stringify(ownList), /email|@example|password/);
    assert.equal(
      (await fetch(`${base}/my-playlists?pageSize=51`, { headers })).status,
      400,
    );
    const firstPage = await (
      await fetch(`${base}/my-playlists?pageSize=1`, { headers })
    ).json();
    assert.equal(firstPage.items.length, 1);
    assert.ok(firstPage.nextCursor);
    const secondPage = await (
      await fetch(
        `${base}/my-playlists?pageSize=1&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
        { headers },
      )
    ).json();
    assert.notEqual(secondPage.items[0].id, firstPage.items[0].id);
    const { watchPlaylists } = require("../src/services/libraryService.ts");
    let stop;
    try {
      const observed = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Playlist subscription timeout")),
          5000,
        );
        stop = watchPlaylists(
          "local-listener",
          (items) => {
            clearTimeout(timer);
            resolve(items);
          },
          (error) => {
            clearTimeout(timer);
            reject(error);
          },
        );
      });
      assert.ok(observed.some((item) => item.id === id));
    } finally {
      stop?.();
    }
    assert.equal(
      (
        await fetch(`${base}/playlists/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ ...fields, userId: "local-member" }),
        })
      ).status,
      400,
    );
    const added = await Promise.all([
      fetch(songUrl, { method: "PUT", headers }),
      fetch(songUrl, { method: "PUT", headers }),
    ]);
    assert.ok(added.every((response) => response.status === 200));
    assert.deepEqual((await ref.get()).data().songIds, ["local-song-000"]);
    assert.equal(
      (
        await fetch(`${base}/playlists/${id}/songs/local-private`, {
          method: "PUT",
          headers,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}/playlists/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ ...fields, isPublic: true }),
        })
      ).status,
      200,
    );
    assert.equal((await ref.get()).data().isPublic, true);
    await ref.update({
      songIds: Array.from({ length: 50 }, (_, i) => `placeholder-${i}`),
      songCount: 50,
    });
    assert.equal(
      (await fetch(songUrl, { method: "PUT", headers })).status,
      409,
    );
    await ref.update({ songIds: ["local-song-000"], songCount: 1 });
    assert.equal(
      (await fetch(songUrl, { method: "DELETE", headers })).status,
      200,
    );
    assert.deepEqual((await ref.get()).data().songIds, []);
    const other = await signInWithEmailAndPassword(
      auth,
      "local-artist-04@example.test",
      PASSWORD,
    );
    assert.equal(
      (
        await fetch(`${base}/playlists/${id}`, {
          method: "PATCH",
          headers: {
            ...headers,
            Authorization: `Bearer ${await other.user.getIdToken()}`,
          },
          body: JSON.stringify(fields),
        })
      ).status,
      404,
    );
    assert.equal(
      (await fetch(`${base}/playlists/${id}`, { method: "DELETE", headers }))
        .status,
      200,
    );
    assert.equal((await ref.get()).exists, false);
    assert.equal(
      (await adminDb.doc("songs/local-song-000").get()).exists,
      true,
    );
  } finally {
    await ref.delete();
  }
});

test("public playlist DTO excludes private songs and user fields, paginates and revokes on hide", async () => {
  const viewer = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const headers = { Authorization: `Bearer ${await viewer.user.getIdToken()}` };
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = adminDb.collection("users/local-artist-01/playlists").doc();
  const hidden = adminDb.collection("users/local-artist-01/playlists").doc();
  const value = {
    name: "Public mixed playlist",
    description: "",
    isPublic: true,
    userId: "local-artist-01",
    songIds: ["local-song-000", "local-private"],
  };
  try {
    await ref.set(value);
    await hidden.set({
      ...value,
      name: "Only private songs",
      songIds: ["local-private"],
    });
    const url = `${base}/playlist-info?ownerId=local-artist-01&id=${ref.id}`;
    const detail = await fetch(url, { headers });
    assert.equal(detail.status, 200);
    const body = await detail.json();
    assert.deepEqual(
      body.songs.map((song) => song.id),
      ["local-song-000"],
    );
    assert.deepEqual(body.playlist.songIds, ["local-song-000"]);
    assert.equal(body.own, false);
    assert.ok(!JSON.stringify(body).includes("local-private"));
    assert.ok(!JSON.stringify(body).includes("@example.test"));
    const listed = [];
    let cursor = null,
      pages = 0;
    do {
      const response = await fetch(
        `${base}/user-playlists?ownerId=local-artist-01&pageSize=1${cursor ? `&cursor=${cursor}` : ""}`,
        { headers },
      );
      assert.equal(response.status, 200);
      const page = await response.json();
      listed.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor && ++pages < 10);
    assert.ok(listed.some((row) => row.id === ref.id && row.songCount === 1));
    assert.ok(!listed.some((row) => row.id === hidden.id));
    const owner = await signInWithEmailAndPassword(
      auth,
      "local-artist-01@example.test",
      PASSWORD,
    );
    const own = await (
      await fetch(url, {
        headers: { Authorization: `Bearer ${await owner.user.getIdToken()}` },
      })
    ).json();
    assert.equal(own.own, true);
    assert.ok(own.songs.some((song) => song.id === "local-private"));
    await ref.update({ isPublic: false });
    assert.equal((await fetch(url, { headers })).status, 404);
  } finally {
    await Promise.all([ref.delete(), hidden.delete()]);
  }
});

test("song owner can change cover and soft-delete; others cannot, and unrelated fields are preserved", async () => {
  const owner = await signInWithEmailAndPassword(
    auth,
    "local-artist-05@example.test",
    PASSWORD,
  );
  const headers = {
    Authorization: `Bearer ${await owner.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const source = await adminDb
    .collection("songs")
    .where("artistId", "==", "local-artist-05")
    .limit(1)
    .get();
  const ref = adminDb.collection("songs").doc();
  const original = { ...source.docs[0].data(), songId: ref.id };
  try {
    await ref.set(original);
    const url = `${base}/songs/${ref.id}`;
    const patch = (value, requestHeaders = headers) =>
      fetch(`${url}/cover`, {
        method: "PATCH",
        headers: requestHeaders,
        body: JSON.stringify(value),
      });
    assert.equal(
      (await patch({ coverUrl: "http://example.test/a.jpg" })).status,
      400,
    );
    assert.equal(
      (
        await patch({
          coverUrl: "https://example.test/a.jpg",
          artistId: "local-member",
        })
      ).status,
      400,
    );
    const other = await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
    const otherHeaders = {
      ...headers,
      Authorization: `Bearer ${await other.user.getIdToken()}`,
    };
    assert.equal(
      (await patch({ coverUrl: "https://example.test/a.jpg" }, otherHeaders))
        .status,
      403,
    );
    assert.equal(
      (await fetch(url, { method: "DELETE", headers: otherHeaders })).status,
      403,
    );
    assert.equal(
      (await patch({ coverUrl: "https://example.test/a.jpg" })).status,
      200,
    );
    const changed = (await ref.get()).data();
    assert.equal(changed.coverUrl, "https://example.test/a.jpg");
    for (const key of [
      "audioUrl",
      "active",
      "playCount",
      "artistId",
      "isPublic",
    ])
      assert.deepEqual(changed[key], original[key]);
    assert.equal((await fetch(url, { method: "DELETE", headers })).status, 200);
    assert.equal((await fetch(url, { method: "DELETE", headers })).status, 200);
    const deleted = (await ref.get()).data();
    assert.equal(deleted.active, false);
    assert.equal(deleted.active, false);
    assert.equal(deleted.playCount, original.playCount);
    assert.equal(deleted.audioUrl, original.audioUrl);
    assert.equal(
      (await patch({ coverUrl: "https://example.test/b.jpg" })).status,
      409,
    );
  } finally {
    await ref.delete();
  }
});

test("related artist API is read-only, bounded and does not expose private user fields", async () => {
  const viewer = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const headers = { Authorization: `Bearer ${await viewer.user.getIdToken()}` };
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const before = await adminDb.collectionGroup("following").get();
  const snapshot = (rows) =>
    rows.docs.map((doc) => [doc.ref.path, JSON.stringify(doc.data())]).sort();
  const response = await fetch(`${base}/related-artists?id=local-artist-01`, {
    headers,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.ok(body.artists.length <= 10);
  assert.ok(
    body.artists.every(
      (artist) => artist.id !== "local-artist-01" && artist.active,
    ),
  );
  assert.ok(!JSON.stringify(body).includes("@example.test"));
  assert.equal(
    (await fetch(`${base}/related-artists?id=missing-profile`, { headers }))
      .status,
    404,
  );
  assert.deepEqual(
    snapshot(await adminDb.collectionGroup("following").get()),
    snapshot(before),
  );
});

test("related artist fan signals use relation paths without userId and invalidate after unfollow", async () => {
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const template = (await adminDb.doc("songs/local-song-000").get()).data();
  const artists = ["graph-target", "graph-a", "graph-b", "graph-c"],
    fans = ["graph-fan-1", "graph-fan-2", "graph-fan-3"];
  const refs = [],
    relations = [];
  const batch = adminDb.batch();
  for (const id of [...artists, ...fans]) {
    const ref = adminDb.doc(`users/${id}`);
    refs.push(ref);
    batch.set(ref, {
      displayName: id,
      active: true,
      followerCount: 0,
      followingCount: 0,
    });
  }
  for (const id of artists) {
    const ref = adminDb.doc(`songs/${id}`);
    refs.push(ref);
    batch.set(ref, {
      ...template,
      songId: id,
      artistId: id,
      albumId: "",
      genre: [id === "graph-target" ? "Jazz" : "Rock"],
    });
  }
  for (const fan of fans)
    for (const target of artists) {
      const ref = adminDb.doc(`users/${fan}/following/${target}`);
      refs.push(ref);
      relations.push(ref);
      batch.set(ref, { followedAt: new Date() });
    }
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 7000;
    while (Date.now() < deadline) {
      const response = await listenerRequest(
        "/related-artists?id=graph-target",
      );
      if (response.status === 200 && predicate(await response.json())) return;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert.fail("Follow graph did not update recommendations.");
  };
  try {
    await batch.commit();
    await waitFor(
      (result) =>
        result.title === "Người hâm mộ cũng thích" &&
        ["graph-a", "graph-b", "graph-c"].every((id) =>
          result.artists.some((artist) => artist.id === id),
        ),
    );
    const removed = adminDb.batch();
    for (const ref of relations.filter((r) => r.id === "graph-target"))
      removed.delete(ref);
    await removed.commit();
    await waitFor((result) => result.title === "Khám phá nghệ sĩ");
  } finally {
    const cleanup = adminDb.batch();
    for (const ref of refs) cleanup.delete(ref);
    await cleanup.commit();
  }
});

test("verified song creation serializes the 180-minute quota, retries idempotently and releases soft-deleted time", async () => {
  const {
    createOwnedSong,
    validateSongInput,
  } = require("../tools/backend/song-create.cjs");
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const refs = [
    adminDb.collection("songs").doc(),
    adminDb.collection("songs").doc(),
  ];
  const inputs = refs.map((ref) =>
    validateSongInput({
      requestId: ref.id,
      title: "Quota test",
      artistNames: ["Listener"],
      genre: ["Pop"],
      lyric: "",
      description: "",
      albumId: "",
      coverUrl: "",
      isPublic: false,
      audioPublicId: "musicstream/local-listener/audio/test",
    }),
  );
  const audio = { url: "https://example.test/verified.mp3", duration: 7000 };
  try {
    const results = await Promise.allSettled(
      inputs.map((input) =>
        createOwnedSong(adminDb, "local-listener", input, audio),
      ),
    );
    assert.equal(
      results.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const failed = results.findIndex((result) => result.status === "rejected");
    assert.equal(
      results[failed].reason.status,
      409,
      String(results[failed].reason),
    );
    const winner = failed === 0 ? 1 : 0;
    assert.equal(
      (await createOwnedSong(adminDb, "local-listener", inputs[winner], audio))
        .reused,
      true,
    );
    assert.equal((await refs[winner].get()).data().durationSeconds, 7000);
    await refs[winner].update({ active: false, isPublished: false });
    assert.equal(
      (await createOwnedSong(adminDb, "local-listener", inputs[failed], audio))
        .reused,
      false,
    );
  } finally {
    await Promise.all(refs.map((ref) => ref.delete()));
  }
});

test("deactivation retains data, disables Auth and blocks further backend access", async () => {
  const result = await signInWithEmailAndPassword(
    auth,
    "local-artist-24@example.test",
    PASSWORD,
  );
  const uid = result.user.uid;
  const headers = {
    Authorization: `Bearer ${await result.user.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const { db: adminDb, auth: adminAuth } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = adminDb.doc(`users/${uid}`);
  const before = await adminDb
    .collection("songs")
    .where("artistId", "==", uid)
    .get();
  try {
    assert.equal(
      (
        await fetch(`${base}/me/deactivate`, {
          method: "PATCH",
          headers,
          body: "{}",
        })
      ).status,
      200,
    );
    assert.equal((await ref.get()).data().active, false);
    assert.equal((await adminAuth.getUser(uid)).disabled, true);
    assert.equal(
      (await adminDb.collection("songs").where("artistId", "==", uid).get())
        .size,
      before.size,
    );
    assert.equal((await fetch(`${base}/uploads`, { headers })).status, 401);
    await signOut(auth);
    await assert.rejects(
      signInWithEmailAndPassword(
        auth,
        "local-artist-24@example.test",
        PASSWORD,
      ),
      { code: "auth/user-disabled" },
    );
  } finally {
    await adminAuth.updateUser(uid, { disabled: false });
    await ref.update({ active: true });
  }
});

test("uploads quota is scoped to token UID, includes private songs and rejects inactive users", async () => {
  assert.equal((await fetch(`${base}/uploads-info`)).status, 401);
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const result = await signInWithEmailAndPassword(
    auth,
    "local-artist-01@example.test",
    PASSWORD,
  );
  const headers = { Authorization: `Bearer ${await result.user.getIdToken()}` };
  const source = await adminDb
    .collection("songs")
    .where("artistId", "==", result.user.uid)
    .where("active", "==", true)
    .get();
  const expected = source.docs.reduce(
    (sum, doc) => sum + Number(doc.data().durationSeconds),
    0,
  );
  const response = await fetch(`${base}/uploads-info?uid=local-artist-02`, {
    headers,
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.usedSeconds, expected);
  assert.equal(body.songCount, source.size);
  assert.equal(body.limitSeconds, 10800);
  assert.equal(body.percentUsed, (expected / 10800) * 100);
  const first = await fetch(`${base}/uploads?pageSize=2`, { headers });
  assert.equal(first.status, 200);
  const firstPage = await first.json();
  assert.equal(firstPage.items.length, 2);
  assert.ok(firstPage.nextCursor);
  const loaded = [...firstPage.items];
  let cursor = firstPage.nextCursor;
  while (cursor) {
    const pageResponse = await fetch(
      `${base}/uploads?pageSize=2&cursor=${encodeURIComponent(cursor)}`,
      { headers },
    );
    assert.equal(pageResponse.status, 200);
    const page = await pageResponse.json();
    loaded.push(...page.items);
    cursor = page.nextCursor;
  }
  assert.deepEqual(
    loaded.map((row) => row.item.id).sort(),
    source.docs.map((doc) => doc.id).sort(),
  );
  assert.ok(loaded.every((row) => row.item.artistId === result.user.uid));
  assert.ok(loaded.some((row) => row.item.isPublic === false));
  const mismatched = await fetch(
    `${base}/uploads?q=other&cursor=${encodeURIComponent(firstPage.nextCursor)}`,
    { headers },
  );
  assert.equal(mismatched.status, 400);
  const listener = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const listenerHeaders = {
    Authorization: `Bearer ${await listener.user.getIdToken()}`,
  };
  assert.equal(
    (
      await fetch(
        `${base}/uploads?cursor=${encodeURIComponent(firstPage.nextCursor)}`,
        { headers: listenerHeaders },
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(`${base}/uploads?uid=local-artist-01`, {
        headers: listenerHeaders,
      })
    ).status,
    200,
  );
  assert.deepEqual(
    (
      await (
        await fetch(`${base}/uploads`, { headers: listenerHeaders })
      ).json()
    ).items,
    [],
  );
  const userRef = adminDb.doc(`users/${result.user.uid}`);
  try {
    await userRef.update({ active: false });
    assert.equal(
      (await fetch(`${base}/uploads-info`, { headers })).status,
      403,
    );
  } finally {
    await userRef.update({ active: true });
  }
});

test("ordinary member cannot read private songs and seeding is repeatable", async () => {
  await signInWithEmailAndPassword(auth, "local-member@example.test", PASSWORD);
  await assert.rejects(getDoc(doc(db, "songs/local-private")));
  await seedLocal();
  const { db: serverDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  assert.equal((await serverDb.collection("songs").get()).size, 123);
});

test("Follow/Unfollow updates each counter once, is idempotent under concurrency", async () => {
  const {
    setFollow,
    watchFollowing,
  } = require("../src/services/libraryService.ts");
  const {
    watchFollowedArtistSongs,
    getReadableSong,
  } = require("../src/services/catalogService.ts");
  const { configureLocalAdmin } = require("../tools/local/environment.cjs");
  const { db: adminDb } = configureLocalAdmin();
  const template = (await adminDb.doc("songs/local-song-000").get()).data();
  await adminDb.doc("songs/m1-followers").set({
    ...template,
    songId: "m1-followers",
    artistId: "local-artist-24",
    isPublic: true,
  });
  const result = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const owner = "local-listener",
    target = "local-artist-24";
  const targetRef = doc(db, "users", target);
  const beforeOwn = (await adminDb.doc(`users/${owner}`).get()).data()
    .followingCount;
  const beforeTarget = (await adminDb.doc(`users/${target}`).get()).data()
    .followerCount;
  let followingSeen = [];
  const stop = watchFollowing(
    owner,
    (ids) => {
      followingSeen = ids;
    },
    (error) => {
      throw error;
    },
  );
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 5000;
    while (!predicate()) {
      if (Date.now() > deadline) throw new Error("Listener timeout");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  let stopSongs = () => {};
  try {
    try {
      await Promise.all([
        setFollow(owner, target, true),
        setFollow(owner, target, true),
      ]);
    } catch (error) {
      const coverage = await fetch(
        `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/demo-music-stream:ruleCoverage`,
      );
      require("node:fs").writeFileSync(
        ".local/m1-rules-coverage.json",
        await coverage.text(),
      );
      throw error;
    }
    await waitFor(() => followingSeen.includes(target));
    assert.equal(
      (await adminDb.doc(`users/${owner}`).get()).data().followingCount,
      beforeOwn + 1,
    );
    assert.equal(
      (await adminDb.doc(`users/${target}`).get()).data().followerCount,
      beforeTarget + 1,
    );
    await setFollow(owner, target, true);
    assert.equal(
      (await adminDb.doc(`users/${target}`).get()).data().followerCount,
      beforeTarget + 1,
    );
    assert.equal((await getReadableSong("m1-followers")).id, "m1-followers");
    let songs = [],
      failure;
    stopSongs = watchFollowedArtistSongs(
      target,
      (items) => {
        songs = items;
      },
      (error) => {
        failure = error;
      },
    );
    await waitFor(
      () => songs.some((item) => item.id === "m1-followers") || failure,
    );
    assert.equal(failure, undefined);
    await Promise.all([
      setFollow(owner, target, false),
      setFollow(owner, target, false),
    ]);
    await waitFor(() => !followingSeen.includes(target));
    assert.equal(
      (await adminDb.doc(`users/${owner}`).get()).data().followingCount,
      beforeOwn,
    );
    assert.equal(
      (await adminDb.doc(`users/${target}`).get()).data().followerCount,
      beforeTarget,
    );
    await setFollow(owner, target, false);
    assert.equal(
      (await adminDb.doc(`users/${target}`).get()).data().followerCount,
      beforeTarget,
    );
    await Promise.all([
      setFollow(owner, target, true),
      setFollow(owner, target, false),
    ]);
    assert.equal(
      (await adminDb.doc(`users/${owner}`).get()).data().followingCount,
      beforeOwn,
    );
    assert.equal(
      (await adminDb.doc(`users/${target}`).get()).data().followerCount,
      beforeTarget,
    );
    assert.equal(
      (await adminDb.doc(`users/${owner}/following/${target}`).get()).exists,
      false,
    );
    await assert.rejects(
      setFollow("local-member", target, true),
      /đúng tài khoản/,
    );
    assert.equal((await getReadableSong("m1-followers")).id, "m1-followers");
    assert.equal(
      (await listenerRequest(`/catalog/followed-artist-songs/${target}`))
        .status,
      403,
    );
    await adminDb.doc("songs/m1-followers").update({ isPublic: false });
    await assert.rejects(getReadableSong("m1-followers"), {
      code: "permission-denied",
    });
    await assert.rejects(setFollow(owner, owner, true), /tự theo dõi/);
    await assert.rejects(
      setFollow(owner, "missing-profile", true),
      /Không tìm thấy/,
    );
    // A direct counter write still fails; the fix does not weaken rules.
    await assert.rejects(
      updateDoc(targetRef, { followerCount: beforeTarget + 10 }),
      { code: "permission-denied" },
    );
  } finally {
    stopSongs();
    stop();
    await adminDb.doc("songs/m1-followers").delete();
  }
});

test("song favorite API scopes to token, preserves retry timestamps and checks live permissions", async () => {
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const { setFavorite } = require("../src/services/libraryService.ts");
  const { db: serverDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const ref = serverDb.doc("users/local-listener/favorites/local-song-004");
  const source = serverDb.doc("songs/local-song-004");
  const original = (await source.get()).data();
  await ref.delete();
  const headers = {
    Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
  };
  const request = (method, path) => fetch(base + path, { method, headers });
  try {
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request("PUT", "/favorites/local-song-004?uid=local-member"),
      ),
    );
    assert.ok(responses.every((response) => response.status === 200));
    const first = (await ref.get()).data();
    assert.deepEqual(Object.keys(first), ["favoritedAt"]);
    const relationPage = await (
      await fetch(`${base}/favorites?uid=local-member&pageSize=1`, { headers })
    ).json();
    assert.equal(relationPage.items.length, 1);
    assert.deepEqual(Object.keys(relationPage.items[0]), ["id"]);
    assert.ok(relationPage.nextCursor);
    const relationNext = await (
      await fetch(
        `${base}/favorites?pageSize=1&cursor=${encodeURIComponent(relationPage.nextCursor)}`,
        { headers },
      )
    ).json();
    assert.notEqual(relationNext.items[0].id, relationPage.items[0].id);
    assert.equal(
      (await fetch(`${base}/following?pageSize=51`, { headers })).status,
      400,
    );
    await setFavorite("local-listener", "local-song-004", true);
    assert.equal(
      (await ref.get()).data().favoritedAt.toMillis(),
      first.favoritedAt.toMillis(),
    );
    assert.equal(
      (await serverDb.doc("users/local-member/favorites/local-song-004").get())
        .exists,
      false,
    );
    assert.equal(
      (await request("PUT", "/favorites/local-private")).status,
      403,
    );
    assert.equal((await request("PUT", "/favorites/missing-song")).status, 404);
    assert.equal((await request("PUT", "/favorites/bad%2Fid")).status, 400);
    await assert.rejects(setFavorite("local-member", "local-song-004", true));
    await source.update({ active: false, isPublished: false });
    assert.equal(
      (await request("PUT", "/favorites/local-song-004")).status,
      403,
    );
    await setFavorite("local-listener", "local-song-004", false);
    await setFavorite("local-listener", "local-song-004", false);
    assert.equal((await ref.get()).exists, false);
    await assert.rejects(
      updateDoc(doc(db, "users/local-listener/favorites/local-song-004"), {
        songId: "local-song-004",
      }),
      { code: "permission-denied" },
    );
  } finally {
    await source.set(original);
    await ref.delete();
  }
});

test("follow API serializes concurrent clients, rejects inactive targets and permits cleanup", async () => {
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const { db: serverDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const own = serverDb.doc("users/local-listener"),
    target = serverDb.doc("users/local-member");
  const account = serverDb.doc("users/local-member");
  const ownBefore = (await own.get()).data(),
    targetBefore = (await target.get()).data();
  const headers = {
    Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
  };
  const change = (method, id = "local-member") =>
    fetch(`${base}/following/${id}?uid=local-artist-01`, { method, headers });
  const ref = serverDb.doc("users/local-listener/following/local-member");
  try {
    assert.equal((await change("PUT", "local-listener")).status, 400);
    assert.equal((await change("PUT", "missing-profile")).status, 404);
    assert.equal((await change("PUT", "bad%2Fid")).status, 400);
    const responses = await Promise.all(
      Array.from({ length: 5 }, () => change("PUT")),
    );
    assert.ok(responses.every((response) => response.status === 200));
    assert.equal(
      (await own.get()).data().followingCount,
      ownBefore.followingCount + 1,
    );
    assert.equal(
      (await target.get()).data().followerCount,
      targetBefore.followerCount + 1,
    );
    const timestamp = (await ref.get()).data().followedAt.toMillis();
    await change("PUT");
    assert.equal((await ref.get()).data().followedAt.toMillis(), timestamp);
    await account.update({ active: false });
    assert.equal((await change("PUT")).status, 403);
    const removals = await Promise.all(
      Array.from({ length: 4 }, () => change("DELETE")),
    );
    assert.ok(removals.every((response) => response.status === 200));
    assert.equal(
      (await own.get()).data().followingCount,
      ownBefore.followingCount,
    );
    assert.equal(
      (await target.get()).data().followerCount,
      targetBefore.followerCount,
    );
    assert.equal((await ref.get()).exists, false);
    await account.update({ active: true });
    await own.update({ followingCount: -1 });
    assert.equal((await change("PUT")).status, 409);
    assert.equal((await ref.get()).exists, false);
  } finally {
    await own.update({
      followingCount: ownBefore.followingCount,
      ...(ownBefore.lastFollowingId
        ? { lastFollowingId: ownBefore.lastFollowingId }
        : {}),
    });
    await target.update({ followerCount: targetBefore.followerCount });
    await account.update({ active: true });
    await ref.delete();
  }
});

test("feed API derives author from token/profile, validates public song and enforces ownership", async () => {
  await signInWithEmailAndPassword(
    auth,
    "local-artist-23@example.test",
    PASSWORD,
  );
  const { db: serverDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const feed = require("../src/services/feedService.ts");
  const headers = {
    Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
    "Content-Type": "application/json",
  };
  const request = (method, path, value, customHeaders = headers) =>
    fetch(base + path, {
      method,
      headers: customHeaders,
      body: value === undefined ? undefined : JSON.stringify(value),
    });
  let postId, commentId;
  const uid = "local-artist-23";
  try {
    assert.equal(
      (
        await request("POST", "/posts", {
          content: "x",
          songId: "",
          ownerId: "local-member",
        })
      ).status,
      400,
    );
    assert.equal(
      (await request("POST", "/posts", { content: " ", songId: "" })).status,
      400,
    );
    assert.equal(
      (
        await request("POST", "/posts", {
          content: "x".repeat(2001),
          songId: "",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("POST", "/posts", {
          content: "x",
          songId: "local-private",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request("POST", "/posts", {
          content: "x",
          songId: "missing-song",
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("POST", "/posts", {
          content: "x".repeat(17000),
          songId: "",
        })
      ).status,
      413,
    );
    const retryHeaders = { ...headers, "Idempotency-Key": "feed-retry-test" };
    const payload = {
      content: "  Bài đăng của tôi  ",
      songId: "local-song-004",
    };
    const created = await (
      await request("POST", "/posts", payload, retryHeaders)
    ).json();
    postId = created.id;
    const repeated = await Promise.all(
      Array.from({ length: 3 }, () =>
        request("POST", "/posts", payload, retryHeaders),
      ),
    );
    for (const response of repeated)
      assert.equal((await response.json()).id, postId);
    assert.equal(
      (
        await request(
          "POST",
          "/posts",
          { ...payload, content: "different" },
          retryHeaders,
        )
      ).status,
      409,
    );
    const ref = serverDb.doc(`posts/${postId}`);
    const original = (await ref.get()).data();
    assert.equal(original.ownerId, uid);
    const listing = await (await request("GET", "/posts?pageSize=1")).json();
    assert.equal(listing.items[0].id, postId);
    assert.equal(
      listing.items[0].authorName,
      (await serverDb.doc(`users/${uid}`).get()).data().displayName,
    );
    assert.doesNotMatch(JSON.stringify(listing), /email|@example|password/);
    assert.equal((await request("GET", "/posts?pageSize=51")).status, 400);
    assert.equal(original.authorName, undefined);
    assert.equal(original.content, "Bài đăng của tôi");
    await feed.updatePost(postId, "Đã chỉnh sửa");
    assert.equal(
      (await ref.get()).data().createdAt.toMillis(),
      original.createdAt.toMillis(),
    );
    await signInWithEmailAndPassword(
      auth,
      "local-artist-22@example.test",
      PASSWORD,
    );
    const other = {
      Authorization: `Bearer ${await auth.currentUser.getIdToken()}`,
      "Content-Type": "application/json",
    };
    assert.equal(
      (await request("PATCH", `/posts/${postId}`, { content: "forged" }, other))
        .status,
      403,
    );
    assert.equal(
      (await request("DELETE", `/posts/${postId}`, undefined, other)).status,
      403,
    );
    const comment = await feed.createComment(
      postId,
      "local-artist-22",
      "Bình luận",
    );
    commentId = comment.id;
    const commentRef = ref.collection("comments").doc(commentId);
    const initial = (await commentRef.get()).data();
    assert.equal(initial.ownerId, "local-artist-22");
    const commentPage = await (
      await request("GET", `/posts/${postId}/comments`)
    ).json();
    assert.equal(commentPage.items[0].id, commentId);
    assert.equal(
      (
        await request("PATCH", `/posts/${postId}/comments/${commentId}`, {
          content: "forged",
        })
      ).status,
      403,
    );
    assert.equal(
      (await request("DELETE", `/posts/${postId}/comments/${commentId}`))
        .status,
      403,
    );
    assert.equal(
      (
        await request(
          "POST",
          `/posts/${postId}/comments`,
          { content: "x".repeat(1001) },
          other,
        )
      ).status,
      400,
    );
    await feed.updateComment(postId, commentId, "Sửa bình luận");
    assert.equal((await commentRef.get()).data().content, "Sửa bình luận");
    assert.equal(
      (await commentRef.get()).data().createdAt.toMillis(),
      initial.createdAt.toMillis(),
    );
    await signInWithEmailAndPassword(
      auth,
      "local-artist-23@example.test",
      PASSWORD,
    );
    await feed.archivePost(postId);
    await feed.archivePost(postId);
    assert.equal((await ref.get()).data().active, false);
    assert.equal(
      (await request("GET", `/posts/${postId}/comments`)).status,
      404,
    );
    assert.equal((await commentRef.get()).exists, true);
    assert.equal(
      (await request("PATCH", `/posts/${postId}`, { content: "revive" }))
        .status,
      409,
    );
    assert.equal(
      (
        await request(
          "POST",
          `/posts/${postId}/comments`,
          { content: "new" },
          other,
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await request(
          "PATCH",
          `/posts/${postId}/comments/${commentId}`,
          { content: "new" },
          other,
        )
      ).status,
      403,
    );
    await signInWithEmailAndPassword(
      auth,
      "local-artist-22@example.test",
      PASSWORD,
    );
    await feed.deleteComment(postId, commentId);
    await feed.deleteComment(postId, commentId);
    assert.equal((await commentRef.get()).exists, false);
  } finally {
    if (postId) {
      if (commentId)
        await serverDb.doc(`posts/${postId}/comments/${commentId}`).delete();
      await serverDb.doc(`posts/${postId}`).delete();
    }
    await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
  }
});

async function listenerRequest(path) {
  const token = await auth.currentUser.getIdToken();
  return fetch(base + path, { headers: { Authorization: "Bearer " + token } });
}
test("M3 API ranks Vietnamese, pages 20+10, binds cursor and synchronizes public metadata without email", async () => {
  // Isolate this request-heavy scenario from earlier scenarios' rate buckets.
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  server = await createLocalBackend();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.EXPO_PUBLIC_BACKEND_URL = base;
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  await assert.rejects(getDoc(doc(db, "users/local-artist-01")), {
    code: "permission-denied",
  });
  await assert.rejects(getDoc(doc(db, "publicProfiles/local-artist-01")), {
    code: "permission-denied",
  });
  const publicProfile = await listenerRequest("/profiles/local-artist-01");
  assert.equal(publicProfile.status, 200);
  assert.equal((await publicProfile.json()).email, undefined);
  const { db: measuredDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const collection = measuredDb.collection.bind(measuredDb),
    getAll = measuredDb.getAll.bind(measuredDb);
  let scans = 0,
    reads = 0;
  measuredDb.collection = (...args) => {
    scans++;
    return collection(...args);
  };
  measuredDb.getAll = (...refs) => {
    reads += refs.length;
    return getAll(...refs);
  };
  const first = await (
    await listenerRequest("/search?q=duong%20ve&pageSize=20&kind=song")
  ).json();
  assert.equal(first.items.length, 20);
  assert.ok(first.hasMore);
  const next = await (
    await listenerRequest(
      "/search?q=duong%20ve&kind=song&pageSize=10&cursor=" +
        encodeURIComponent(first.nextCursor),
    )
  ).json();
  assert.equal(next.items.length, 10);
  measuredDb.collection = collection;
  measuredDb.getAll = getAll;
  assert.equal(scans, 0);
  assert.equal(reads, 32); // 30 song hydration reads + one active-account read per request.
  assert.equal(
    new Set([...first.items, ...next.items].map((result) => result.item.id))
      .size,
    30,
  );
  assert.equal(
    (
      await listenerRequest(
        "/search?q=binh&kind=song&cursor=" +
          encodeURIComponent(first.nextCursor),
      )
    ).status,
    400,
  );
  assert.equal(
    (
      await listenerRequest(
        "/search?q=duong%20ve&kind=song&cursor=" +
          encodeURIComponent(first.nextCursor + "x"),
      )
    ).status,
    400,
  );
  assert.equal(
    (await listenerRequest("/search?q=x&pageSize=10000")).status,
    400,
  );
  const userPage = await (
    await listenerRequest("/search?q=thanh%20vien")
  ).json();
  assert.ok(
    userPage.items.some(
      (result) => result.kind === "user" && result.item.id === "local-member",
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(userPage),
    /email|@example|token|password/,
  );
  await signInWithEmailAndPassword(auth, "local-member@example.test", PASSWORD);
  assert.equal(
    (
      await listenerRequest(
        "/search?q=duong%20ve&kind=song&cursor=" +
          encodeURIComponent(first.nextCursor),
      )
    ).status,
    400,
  );
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const target = first.items[0].item.id,
    ref = adminDb.doc("songs/" + target),
    old = (await ref.get()).data();
  try {
    await ref.update({ isPublic: false });
    const page = await (
      await listenerRequest("/search?q=duong%20ve&kind=song")
    ).json();
    assert.ok(!page.items.some((result) => result.item.id === target));
    await ref.update({ title: "Chuyen dong dong bo" });
    const deadline = Date.now() + 5000;
    let removed = false;
    while (Date.now() < deadline) {
      const result = await (
        await listenerRequest("/search?q=chuyen%20dong")
      ).json();
      if (!result.items.length) {
        removed = true;
        break;
      }
    }
    assert.ok(removed);
  } finally {
    await ref.set(old);
  }
  const created = adminDb.doc("songs/m3-sync-created");
  const waitForResult = async (query, id) => {
    const deadline = Date.now() + 5000;
    do {
      const response = await listenerRequest(
        "/search?q=" + encodeURIComponent(query) + "&kind=song",
      );
      const page = await response.json();
      if (page.items?.some((result) => result.item.id === id)) return;
      await new Promise((resolve) => setTimeout(resolve, 30));
    } while (Date.now() < deadline);
    throw new Error("Search index sync timeout");
  };
  try {
    await created.set({
      ...old,
      songId: created.id,
      title: "Synchronized fresh record",
    });
    await waitForResult("synchronized fresh", created.id);
    await created.update({ title: "Synchronized renamed record" });
    await waitForResult("synchronized renamed", created.id);
    await created.delete();
    const deleted = await (
      await listenerRequest("/search?q=synchronized%20renamed&kind=song")
    ).json();
    assert.ok(!deleted.items.some((result) => result.item.id === created.id));
  } finally {
    await created.delete();
  }
  const browse = await (
    await listenerRequest("/browse?kind=artists&pageSize=20")
  ).json();
  assert.equal(browse.items.length, 20);
  assert.ok(browse.hasMore);
  const home = await (await listenerRequest("/discovery?seed=stable")).json();
  assert.equal(home.suggestions.length, 20);
  assert.ok(home.artists.length <= 20);
  assert.ok(home.albums.length <= 20);
  assert.equal(new Set(home.suggestions.map((song) => song.id)).size, 20);
  const charts = await (await listenerRequest("/charts?seed=stable")).json();
  for (const chart of charts.charts) {
    const detail = await (
      await listenerRequest(
        "/collection?chartId=" + encodeURIComponent(chart.id) + "&seed=stable",
      )
    ).json();
    assert.deepEqual(
      detail.songs.map((song) => song.id),
      chart.songIds,
    );
    assert.ok(detail.songs.length <= 50);
  }
});
test("profiles read users only and backend refuses legacy profiles without a migration checkpoint", async () => {
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const { assertProfilesReady } = require("../tools/backend/profiles.cjs");
  const ref = adminDb.doc("publicProfiles/local-member");
  assert.equal((await adminDb.collection("publicProfiles").get()).size, 0);
  const before = (await adminDb.doc("users/local-member").get()).data();
  await ref.set({
    displayName: "Stale projection",
    followerCount: 999,
    followingCount: 999,
    email: "never-export@example.test",
  });
  try {
    await assert.rejects(assertProfilesReady(adminDb), /Legacy publicProfiles/);
    const response = await listenerRequest("/profiles/local-member");
    assert.equal(response.status, 200);
    const publicProfile = await response.json();
    assert.equal(publicProfile.name, before.displayName);
    assert.equal(publicProfile.followerCount, before.followerCount);
    assert.equal(publicProfile.followingCount, before.followingCount);
    assert.equal(publicProfile.email, undefined);
    assert.equal((await ref.get()).data().followerCount, 999);
  } finally {
    await ref.delete();
  }
  await assertProfilesReady(adminDb);
});

test("song detail API revalidates permissions and does not disclose private album metadata", async () => {
  const { db: serverDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const songRef = serverDb.collection("songs").doc(),
    albumRef = serverDb.collection("albums").doc();
  const artist = serverDb.doc("users/local-artist-01");
  const template = (await serverDb.doc("songs/local-song-000").get()).data();
  await albumRef.set({
    artistId: "local-artist-01",
    title: "Private album secret",
    isPublic: false,
    isPublic: false,
  });
  await songRef.set({
    ...template,
    songId: songRef.id,
    artistId: "local-artist-01",
    albumId: albumRef.id,

    isPublic: true,
  });
  const {
    getReadableSong,
    watchSong,
  } = require("../src/services/catalogService.ts");
  let stop;
  try {
    await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
    const artistPage = await (
      await listenerRequest("/catalog/artists?pageSize=2")
    ).json();
    assert.equal(artistPage.items.length, 2);
    assert.ok(artistPage.nextCursor);
    assert.doesNotMatch(JSON.stringify(artistPage), /email|@example|password/);
    const artistNext = await (
      await listenerRequest(
        "/catalog/artists?pageSize=2&cursor=" + artistPage.nextCursor,
      )
    ).json();
    assert.ok(
      artistNext.items.every(
        (item) => !artistPage.items.some((old) => old.id === item.id),
      ),
    );
    const publicPage = await (
      await listenerRequest("/catalog/public-songs")
    ).json();
    assert.ok(publicPage.items.length <= 20);
    assert.equal(publicPage.nextCursor, null);
    assert.equal(
      (await listenerRequest("/catalog/albums?pageSize=51")).status,
      400,
    );
    const albumPage = await (await listenerRequest("/catalog/albums")).json();
    assert.ok(!albumPage.items.some((item) => item.id === albumRef.id));
    const publicSong = await getReadableSong(songRef.id);
    assert.equal(publicSong.album, "");
    assert.doesNotMatch(
      JSON.stringify(publicSong),
      /Private album secret|email|@example/,
    );
    await songRef.update({ isPublic: false });
    await assert.rejects(getReadableSong(songRef.id), {
      status: 403,
      code: "permission-denied",
    });
    await signInWithEmailAndPassword(
      auth,
      "local-artist-01@example.test",
      PASSWORD,
    );
    assert.equal(
      (await getReadableSong(songRef.id)).album,
      "Private album secret",
    );
    const ownPage = await (
      await listenerRequest("/catalog/own-songs?uid=local-member")
    ).json();
    assert.ok(ownPage.items.some((item) => item.id === songRef.id));
    assert.ok(
      ownPage.items.every((item) => item.artistId === "local-artist-01"),
    );
    const observed = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Song subscription timeout")),
        5000,
      );
      stop = watchSong(
        songRef.id,
        (item) => {
          clearTimeout(timer);
          resolve(item);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
    assert.equal(observed.id, songRef.id);
    stop();
    stop = undefined;
    await artist.update({ active: false });
    await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
    assert.equal(await getReadableSong(songRef.id), null);
    assert.equal(await getReadableSong("missing-song"), null);
  } finally {
    stop?.();
    await artist.update({ active: true });
    await songRef.delete();
    await albumRef.delete();
    await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
  }
});

test("playback API commits counts once, caps wall time, rejects private tracks and preserves coverage on retry", async () => {
  const { db: serverDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const express = require("node:module").createRequire(
    require.resolve("../tools/package.json"),
  )("express");
  const {
    createPlaybackRouter,
  } = require("../tools/backend/playback-routes.cjs");
  const { finishHttpApp } = require("../tools/backend/http-app.cjs");
  let clock = Date.now() + 1000;
  const app = express();
  app.use((req, res, next) => {
    req.auth = { uid: "local-listener" };
    next();
  });
  app.use(createPlaybackRouter({ db: serverDb, now: () => clock }));
  finishHttpApp(app);
  const isolated = require("node:http").createServer(app);
  isolated.listen(0, "127.0.0.1");
  await once(isolated, "listening");
  const url = `http://127.0.0.1:${isolated.address().port}`;
  const sessionId = serverDb
    .collection("users/local-listener/history")
    .doc().id;
  const trackRef = serverDb.doc("songs/local-song-000"),
    historyRef = serverDb.doc(`users/local-listener/history/${sessionId}`),
    receiptRef = serverDb.doc(
      "users/local-listener/playReceipts/local-song-000",
    );
  const before = (await trackRef.get()).data();
  const receiptBefore = await receiptRef.get();
  const shortId = sessionId + "-short";
  const shortTrack = serverDb.doc("songs/local-song-001");
  const shortHistory = serverDb.doc(`users/local-listener/history/${shortId}`);
  const shortReceipt = serverDb.doc(
    "users/local-listener/playReceipts/local-song-001",
  );
  const shortBefore = (await shortTrack.get()).data();
  const shortReceiptBefore = await shortReceipt.get();
  const send = (body, id = sessionId) =>
    fetch(`${url}/playback/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const start = {
    songId: "local-song-000",
    sequence: 0,
    progressSeconds: 0,
    ranges: [],
  };
  try {
    await receiptRef.delete();
    assert.equal(
      (await send({ ...start, songId: "local-private" }, "private-session"))
        .status,
      403,
    );
    assert.equal((await send({ ...start, durationSeconds: 1 })).status, 400);
    assert.equal((await send(start)).status, 200);
    assert.equal((await send(start)).status, 200);
    const packet = {
      ...start,
      sequence: 1,
      progressSeconds: 30,
      ranges: Array.from({ length: 15 }, (_, index) => [
        index * 2,
        index * 2 + 2,
      ]),
    };
    assert.equal((await send(packet)).status, 400);
    clock += 30000;
    const results = await Promise.all([send(packet), send(packet)]);
    assert.ok(results.every((response) => response.status === 200));
    assert.equal((await historyRef.get()).data().counted, true);
    assert.equal((await historyRef.get()).data().listenedSeconds, 30);
    assert.equal((await trackRef.get()).data().playCount, before.playCount + 1);
    clock += 1000;
    const seek = await (
      await send({
        ...start,
        sequence: 2,
        progressSeconds: before.durationSeconds,
        ranges: [],
      })
    ).json();
    assert.equal(seek.completed, false);
    assert.equal((await trackRef.get()).data().playCount, before.playCount + 1);
    assert.equal((await send({ ...start, sequence: 4 })).status, 409);
    assert.equal(
      (await send({ ...start, sequence: 1 }, "missing-session")).status,
      409,
    );
    assert.equal(
      (await send({ ...start, songId: "local-song-004" })).status,
      409,
    );
    // The 12-second fixture has the same duration as its generated WAV.
    // Seeking to the end cannot qualify; covering >80% and reaching the end can.
    await shortReceipt.delete();
    const shortStart = { ...start, songId: shortTrack.id };
    assert.equal(shortBefore.durationSeconds, 12);
    assert.equal((await send(shortStart, shortId)).status, 200);
    const skipped = await send(
      { ...shortStart, sequence: 1, progressSeconds: 12 },
      shortId,
    );
    assert.equal(skipped.status, 200);
    assert.equal((await skipped.json()).completed, false);
    clock += 10000;
    const shortPacket = {
      ...shortStart,
      sequence: 2,
      progressSeconds: 12,
      ranges: [
        [2, 4],
        [4, 6],
        [6, 8],
        [8, 10],
        [10, 12],
      ],
    };
    for (let retry = 0; retry < 2; retry++) {
      const played = await send(shortPacket, shortId);
      assert.equal(played.status, 200);
      const state = await played.json();
      assert.equal(state.completed, true);
      assert.equal(state.counted, true);
    }
    assert.equal(
      (await shortTrack.get()).data().playCount,
      shortBefore.playCount + 1,
    );
  } finally {
    isolated.closeAllConnections();
    await new Promise((resolve) => isolated.close(resolve));
    await trackRef.set(before);
    if (receiptBefore.exists) await receiptRef.set(receiptBefore.data());
    else await receiptRef.delete();
    await historyRef.delete();
    await shortTrack.set(shortBefore);
    if (shortReceiptBefore.exists)
      await shortReceipt.set(shortReceiptBefore.data());
    else await shortReceipt.delete();
    await shortHistory.delete();
  }
});

test("M4 History uses stable document cursors across duplicate sessions and returns unique readable songs", async () => {
  // Give this independent paging scenario its own rate-limit window/server.
  // Keep the production 120 requests/minute limit intact.
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  server = await createLocalBackend();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
  process.env.EXPO_PUBLIC_BACKEND_URL = base;
  await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const {
    createHistorySource,
  } = require("../src/services/historyPageService.ts");
  const source = createHistorySource("local-listener");
  const recent = await (
    await listenerRequest("/recent-history?uid=local-member")
  ).json();
  assert.equal(recent.items.length, 100);
  assert.equal(recent.nextCursor, null);
  assert.ok(
    recent.items.every(
      (entry) =>
        typeof entry.songId === "string" &&
        typeof entry.listenedSeconds === "number",
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(recent),
    /email|@example|password|audioUrl/,
  );
  const { watchHistory } = require("../src/services/libraryService.ts");
  let stopHistory;
  try {
    const observed = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("History subscription timeout")),
        5000,
      );
      stopHistory = watchHistory(
        "local-listener",
        (items) => {
          clearTimeout(timer);
          resolve(items);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
    assert.deepEqual(
      observed.map((entry) => entry.id),
      recent.items.map((entry) => entry.id),
    );
  } finally {
    stopHistory?.();
  }
  const items = [];
  const [initial, replayed] = await Promise.all([
    source(null, 10),
    source(null, 10),
  ]);
  assert.deepEqual(initial, replayed);
  let page = initial,
    requests = 1;
  assert.equal(page.items.length, 10);
  items.push(...page.items);
  while (page.hasMore && requests++ < 30) {
    page = await source(page.nextCursor, 10);
    assert.ok(page.items.length <= 10);
    items.push(...page.items);
  }
  assert.equal(page.hasMore, false);
  assert.equal(items.length, 80);
  assert.equal(new Set(items.map((row) => row.song.id)).size, 80);
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const { Timestamp } = require("node:module").createRequire(
    require.resolve("../tools/package.json"),
  )("firebase-admin/firestore");
  const stamp = Timestamp.now(),
    batch = adminDb.batch();
  for (let index = 80; index < 120; index++)
    batch.set(adminDb.doc(`users/local-listener/history/tie-${index}`), {
      historyId: `tie-${index}`,
      songId: `local-song-${String(index).padStart(3, "0")}`,
      playedAt: stamp,
      startedAt: stamp,
      progressSeconds: 1,
      durationSeconds: 95,
      listenedSeconds: 1,
      completed: false,
      counted: false,
    });
  batch.set(adminDb.doc("users/local-listener/history/tie-private"), {
    songId: "local-private",
    playedAt: stamp,
  });
  await batch.commit();
  const capped = createHistorySource("local-listener"),
    allRows = [];
  let cappedPage = await capped(null, 10),
    rounds = 0;
  allRows.push(...cappedPage.items);
  while (cappedPage.hasMore && rounds++ < 30) {
    cappedPage = await capped(cappedPage.nextCursor, 10);
    allRows.push(...cappedPage.items);
  }
  assert.equal(allRows.length, 100);
  assert.equal(new Set(allRows.map((row) => row.song.id)).size, 100);
  assert.equal(cappedPage.hasMore, false);
  const retry = createHistorySource("local-listener");
  const originalFetch = global.fetch;
  global.fetch = (url, options) =>
    String(url).startsWith(`${base}/history`)
      ? Promise.reject(new Error("Simulated backend network failure"))
      : originalFetch(url, options);
  try {
    await assert.rejects(retry(null, 10));
  } finally {
    global.fetch = originalFetch;
  }
  assert.equal((await retry(null, 10)).items.length, 10);
  await signOut(auth);
  await assert.rejects(source(null, 10), /thay đổi/);
});
test("album/playlist create retries are atomic, scoped by UID, and reject changed payloads", async () => {
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const owner = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const ownerToken = await owner.user.getIdToken();
  const other = await signInWithEmailAndPassword(
    auth,
    "local-member@example.test",
    PASSWORD,
  );
  const otherToken = await other.user.getIdToken();
  const refs = [];
  const post = (path, value, token, key) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Idempotency-Key": key,
      },
      body: JSON.stringify(value),
    });
  try {
    for (const [path, fields, titleField] of [
      [
        "/albums",
        {
          title: "Retry album",
          description: "",
          coverUrl: "",
          isPublic: false,
        },
        "title",
      ],
      [
        "/playlists",
        { name: "Retry playlist", description: "", isPublic: false },
        "name",
      ],
    ]) {
      const key = `atomic-create-${path.slice(1)}`;
      const responses = await Promise.all([
        post(path, fields, ownerToken, key),
        post(path, fields, ownerToken, key),
      ]);
      assert.deepEqual(
        responses.map((r) => r.status),
        [201, 201],
      );
      const results = await Promise.all(responses.map((r) => r.json()));
      assert.equal(results[0].id, results[1].id);
      const ref = adminDb.doc(
        path === "/albums"
          ? `albums/${results[0].id}`
          : `users/local-listener/playlists/${results[0].id}`,
      );
      refs.push(ref);
      const before = (await ref.get()).data();
      assert.equal(
        (
          await post(
            path,
            { ...fields, [titleField]: "Different" },
            ownerToken,
            key,
          )
        ).status,
        409,
      );
      assert.equal(
        (await post(path, fields, ownerToken, "bad key")).status,
        400,
      );
      const replay = await post(path, fields, ownerToken, key);
      assert.equal(replay.status, 201);
      assert.equal((await replay.json()).id, ref.id);
      assert.equal(
        (await ref.get()).data().createdAt.toMillis(),
        before.createdAt.toMillis(),
      );
      const otherResponse = await post(path, fields, otherToken, key);
      assert.equal(otherResponse.status, 201);
      const otherId = (await otherResponse.json()).id;
      assert.notEqual(otherId, ref.id);
      refs.push(
        adminDb.doc(
          path === "/albums"
            ? `albums/${otherId}`
            : `users/local-member/playlists/${otherId}`,
        ),
      );
      await ref.update({ [titleField]: "Edited after create" });
      assert.equal((await post(path, fields, ownerToken, key)).status, 409);
      assert.equal((await ref.get()).data()[titleField], "Edited after create");
      const account = adminDb.doc("users/local-member");
      await account.update({ active: false });
      try {
        assert.equal((await post(path, fields, otherToken, key)).status, 403);
      } finally {
        await account.update({ active: true });
      }
    }
  } finally {
    await Promise.all(refs.map((ref) => ref.delete()));
    await signInWithEmailAndPassword(
      auth,
      "local-listener@example.test",
      PASSWORD,
    );
  }
});

test("schema audit reads paginated Emulator roots and orphan subcollections without writing", async () => {
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const {
    readAuditDocuments,
    auditSchema,
  } = require("../tools/backend/schema-audit.cjs");
  const orphan = adminDb.doc(
    "posts/audit-missing-parent/comments/audit-orphan",
  );
  await orphan.set({
    ownerId: "local-listener",
    content: "Keep me",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  try {
    const before = await orphan.get();
    const documents = await readAuditDocuments(adminDb, { pageSize: 37 });
    const report = auditSchema(documents, {
      mode: "emulator",
      maxIssues: 5000,
    });
    assert.ok(report.scannedDocuments > 120);
    assert.equal(report.readyToApply, false);
    assert.ok(
      report.issues.some(
        (issue) => issue.path === orphan.path && issue.code === "orphan_parent",
      ),
    );
    assert.deepEqual((await orphan.get()).data(), before.data());
    assert.equal(
      (await adminDb.doc("posts/audit-missing-parent").get()).exists,
      false,
    );
  } finally {
    await orphan.delete();
  }
});

test("M4 retention keeps 1000 sessions under concurrent cleanup, preserves receipts and promoted sessions", async () => {
  const { db: adminDb } =
    require("../tools/local/environment.cjs").configureLocalAdmin();
  const { Timestamp } = require("node:module").createRequire(
    require.resolve("../tools/package.json"),
  )("firebase-admin/firestore");
  const { retainHistory } = require("../tools/backend/retention.cjs");
  const ref = adminDb.collection("users/retention-check/history");
  for (let start = 0; start < 1105; start += 400) {
    const batch = adminDb.batch();
    for (let i = start; i < Math.min(start + 400, 1105); i++)
      batch.set(ref.doc(String(i).padStart(5, "0")), {
        songId: "local-song-000",
        playedAt: Timestamp.fromMillis(100000 + i * 1000),
        counted: true,
      });
    await batch.commit();
  }
  const receipt = adminDb.doc(
    "users/retention-check/playReceipts/local-song-000",
  );
  await receipt.set({ historyId: "00000", countedAt: Timestamp.now() });
  await ref.doc("00000").update({ playedAt: Timestamp.now() });
  await Promise.all([
    retainHistory(adminDb, "retention-check"),
    retainHistory(adminDb, "retention-check"),
  ]);
  while (await retainHistory(adminDb, "retention-check")) {}
  assert.equal((await ref.count().get()).data().count, 1000);
  assert.ok((await ref.doc("00000").get()).exists);
  assert.ok((await receipt.get()).exists);
  assert.equal(await retainHistory(adminDb, "retention-check"), 0);
});
