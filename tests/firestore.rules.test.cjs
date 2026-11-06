const { test, before, beforeEach, after } = require("node:test");
const { readFileSync } = require("node:fs");
const {
  initializeTestEnvironment,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  collectionGroup,
} = require("firebase/firestore");
let env, a, b, outsider, guest;
const old = Timestamp.fromMillis(Date.now() - 180000);
const user = (id) => ({
  userId: id,
  displayName: id,
  email: id + "@example.test",
  avatarUrl: "",
  biography: "",
  followerCount: 0,
  followingCount: 0,
  active: true,
  createdAt: old,
  updatedAt: old,
});
const profile = (id) => ({
  userId: id,
  displayName: id,
  avatarUrl: "",
  biography: "",
  followerCount: 0,
  followingCount: 0,
  active: true,
});
const song = (id, visibility = "public") => ({
  songId: id,
  title: id,
  artistId: "alice",
  artistNames: ["alice"],
  albumId: "",
  coverUrl: "",
  audioUrl: "",
  audioPublicId: null,
  durationSeconds: 95,
  genre: ["Pop"],
  lyric: "",
  releaseDate: old,
  visibility,
  isPublished: visibility === "public",
  active: true,
  playCount: 0,
  createdAt: old,
  updatedAt: old,
});
const history = (id) => ({
  historyId: id,
  songId: "public",
  playedAt: serverTimestamp(),
  progressSeconds: 0,
  durationSeconds: 95,
  listenedSeconds: 0,
  completed: false,
  counted: false,
  startedAt: serverTimestamp(),
});
before(async () => {
  if (!process.env.FIRESTORE_EMULATOR_HOST)
    throw Error("Run npm run test:local:integration");
  env = await initializeTestEnvironment({
    projectId: "demo-music-rules",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: Number(process.env.FIRESTORE_EMULATOR_HOST.split(":")[1]),
    },
  });
  a = env
    .authenticatedContext("alice", { email: "alice@example.test" })
    .firestore();
  b = env
    .authenticatedContext("bob", { email: "bob@example.test" })
    .firestore();
  outsider = env
    .authenticatedContext("outsider", { email: "outsider@example.test" })
    .firestore();
  guest = env.unauthenticatedContext().firestore();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore(),
      batch = writeBatch(db);
    for (const id of ["alice", "bob", "outsider"]) {
      batch.set(doc(db, "users/" + id), user(id));
      batch.set(doc(db, "publicProfiles/" + id), profile(id));
    }
    for (const visibility of ["public", "private", "followers", "unlisted"])
      batch.set(doc(db, "songs/" + visibility), song(visibility, visibility));
    batch.set(doc(db, "users/alice/playlists/p"), {
      userId: "alice",
      name: "Playlist",
      description: "",
      visibility: "private",
      songIds: [],
      songCount: 0,
      createdAt: old,
      updatedAt: old,
    });
    batch.set(doc(db, "users/alice/history/h"), {
      ...history("h"),
      playedAt: old,
      startedAt: old,
    });
    await batch.commit();
  });
});
after(async () => {
  if (env) await env.cleanup();
});
const paths = [
  "users/alice",
  "publicProfiles/alice",
  "songs/public",
  "songs/private",
  "songs/followers",
  "songs/unlisted",
  "users/alice/playlists/p",
  "users/alice/history/h",
  "users/alice/following/bob",
  "users/alice/favorites/public",
  "users/alice/favoriteAlbums/public",
  "users/alice/playReceipts/public",
  "albums/public",
  "posts/p",
  "posts/p/comments/c",
  "artists/legacy",
  "charts/legacy",
  "future/data/nested/document",
];
beforeEach(async () => {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore(),
      batch = writeBatch(db);
    for (const path of paths) {
      if (
        [
          "users/alice",
          "publicProfiles/alice",
          "users/alice/playlists/p",
          "users/alice/history/h",
        ].includes(path) ||
        path.startsWith("songs/")
      )
        continue;
      batch.set(doc(db, path), {
        ownerId: "alice",
        artistId: "alice",
        active: true,
        isPublic: true,
        isPublished: true,
        visibility: "public",
        createdAt: old,
      });
    }
    await batch.commit();
  });
});
const clients = () => [
  a,
  b,
  outsider,
  guest,
  env.authenticatedContext("alice", { admin: true }).firestore(),
];
test("direct reads deny owners, viewers, legacy claims and guests", async () => {
  for (const db of clients())
    for (const path of paths) await assertFails(getDoc(doc(db, path)));
});
test("collection and collection-group queries cannot bypass the backend", async () => {
  const collections = [
    ...new Set(paths.map((path) => path.slice(0, path.lastIndexOf("/")))),
  ];
  for (const db of clients()) {
    for (const path of collections)
      await assertFails(getDocs(collection(db, path)));
    for (const name of ["following", "playlists", "comments", "favoriteAlbums"])
      await assertFails(getDocs(collectionGroup(db, name)));
  }
});
test("direct create, update and delete are denied even to owners", async () => {
  for (const db of clients())
    for (const path of paths) {
      await assertFails(
        setDoc(doc(db, path + "-new"), {
          ownerId: "alice",
          createdAt: serverTimestamp(),
        }),
      );
      await assertFails(
        updateDoc(doc(db, path), { updatedAt: serverTimestamp() }),
      );
      await assertFails(deleteDoc(doc(db, path)));
    }
  await assertFails(
    updateDoc(doc(a, "songs/public"), {
      title: "Owner",
      updatedAt: serverTimestamp(),
    }),
  );
  const fresh = env
    .authenticatedContext("new", { email: "new@example.test" })
    .firestore();
  await assertFails(
    setDoc(doc(fresh, "users/new"), {
      ...user("new"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});
test("legacy atomic playback and social batches cannot bypass validation", async () => {
  const playback = writeBatch(a);
  playback.update(doc(a, "users/alice/history/h"), {
    counted: true,
    listenedSeconds: 95,
  });
  playback.update(doc(a, "songs/public"), { playCount: 1 });
  playback.set(doc(a, "users/alice/playReceipts/public"), {
    historyId: "h",
    countedAt: serverTimestamp(),
  });
  await assertFails(playback.commit());
  const follow = writeBatch(a);
  follow.set(doc(a, "users/alice/following/new"), {
    userId: "new",
    followedAt: serverTimestamp(),
  });
  follow.update(doc(a, "publicProfiles/alice"), { followingCount: 1 });
  await assertFails(follow.commit());
});
