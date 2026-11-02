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
    EXPO_PUBLIC_AUTH_EMULATOR_PORT: "9099",
    EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT: "8080",
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
  assert.equal(auth.emulatorConfig.port, 9099);
  await assert.rejects(getDoc(doc(db, "songs/local-song-000")), {
    code: "permission-denied",
  });
});

test("local login, catalog/history, visibility and authenticated Node round trip work with real rules", async () => {
  const result = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  const publicSongs = await getDocs(
    query(
      collection(db, "songs"),
      where("visibility", "==", "public"),
      where("isPublished", "==", true),
    ),
  );
  assert.equal(publicSongs.size, 120);
  const history = await getDocs(
    query(
      collection(db, "users/local-listener/history"),
      orderBy("playedAt", "desc"),
      limit(100),
    ),
  );
  assert.equal(history.size, 100);
  assert.equal(new Set(history.docs.map((d) => d.data().songId)).size, 80);
  await assert.rejects(getDoc(doc(db, "songs/local-private")), {
    code: "permission-denied",
  });
  assert.ok((await getDoc(doc(db, "songs/local-followers"))).exists());
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
    isAdmin: false,
  });
  const health = await (await fetch(`${base}/health`)).json();
  assert.equal(health.projectId, "demo-music-stream");
});

test("admin claim exists only in fixture admin and seeding twice is repeatable", async () => {
  const result = await signInWithEmailAndPassword(
    auth,
    "local-admin@example.test",
    PASSWORD,
  );
  assert.equal((await result.user.getIdTokenResult()).claims.admin, true);
  assert.ok((await getDoc(doc(db, "songs/local-private"))).exists());
  await seedLocal();
  const all = await getDocs(collection(db, "songs"));
  assert.equal(all.size, 123);
});

test("Follow/Unfollow updates each counter once, is idempotent under concurrency and needs no admin", async () => {
  const {
    setFollow,
    watchFollowing,
  } = require("../src/services/libraryService.ts");
  const {
    watchArtistFollowerSongs,
    getReadableSong,
  } = require("../src/services/catalogService.ts");
  const { configureLocalAdmin } = require("../tools/local/environment.cjs");
  const { db: adminDb } = configureLocalAdmin();
  const template = (await adminDb.doc("songs/local-song-000").get()).data();
  await adminDb.doc("songs/m1-followers").set({
    ...template,
    songId: "m1-followers",
    artistId: "local-artist-24",
    visibility: "followers",
    isPublished: false,
  });
  const result = await signInWithEmailAndPassword(
    auth,
    "local-listener@example.test",
    PASSWORD,
  );
  assert.notEqual((await result.user.getIdTokenResult()).claims.admin, true);
  const owner = "local-listener",
    target = "local-artist-24";
  const ownRef = doc(db, "users", owner),
    targetRef = doc(db, "users", target);
  const beforeOwn = (await getDoc(ownRef)).data().followingCount;
  const beforeTarget = (await getDoc(targetRef)).data().followerCount;
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
        "http://127.0.0.1:8080/emulator/v1/projects/demo-music-stream:ruleCoverage",
      );
      require("node:fs").writeFileSync(
        ".local/m1-rules-coverage.json",
        await coverage.text(),
      );
      throw error;
    }
    await waitFor(() => followingSeen.includes(target));
    assert.equal((await getDoc(ownRef)).data().followingCount, beforeOwn + 1);
    assert.equal(
      (await getDoc(targetRef)).data().followerCount,
      beforeTarget + 1,
    );
    await setFollow(owner, target, true);
    assert.equal(
      (await getDoc(targetRef)).data().followerCount,
      beforeTarget + 1,
    );
    assert.equal((await getReadableSong("m1-followers")).id, "m1-followers");
    let songs = [],
      failure;
    stopSongs = watchArtistFollowerSongs(
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
    assert.equal((await getDoc(ownRef)).data().followingCount, beforeOwn);
    assert.equal((await getDoc(targetRef)).data().followerCount, beforeTarget);
    await setFollow(owner, target, false);
    assert.equal((await getDoc(targetRef)).data().followerCount, beforeTarget);
    await Promise.all([
      setFollow(owner, target, true),
      setFollow(owner, target, false),
    ]);
    assert.equal((await getDoc(ownRef)).data().followingCount, beforeOwn);
    assert.equal((await getDoc(targetRef)).data().followerCount, beforeTarget);
    assert.equal(
      (await getDoc(doc(db, "users", owner, "following", target))).exists(),
      false,
    );
    await assert.rejects(
      setFollow("local-admin", target, true),
      /đúng tài khoản/,
    );
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
