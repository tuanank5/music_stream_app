const { test, before, beforeEach, after } = require("node:test");
const { readFileSync } = require("node:fs");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
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
  query,
  where,
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
  audioKey: "demo1",
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
test("private users are owner only; public projection readable without email and client metadata writes denied", async () => {
  await assertSucceeds(getDoc(doc(a, "users/alice")));
  await assertFails(getDoc(doc(b, "users/alice")));
  await assertFails(getDocs(collection(b, "users")));
  await assertFails(getDoc(doc(outsider, "users/alice")));
  await assertSucceeds(getDoc(doc(b, "publicProfiles/alice")));
  await assertFails(getDoc(doc(guest, "publicProfiles/alice")));
  await assertFails(
    updateDoc(doc(a, "publicProfiles/alice"), { displayName: "Forged" }),
  );
  await assertFails(
    updateDoc(doc(b, "publicProfiles/alice"), { email: "leak" }),
  );
});
test("song visibility and catalog schema protect guest/private/follower media", async () => {
  await assertFails(getDoc(doc(guest, "songs/public")));
  await assertSucceeds(getDoc(doc(b, "songs/public")));
  await assertFails(getDoc(doc(b, "songs/private")));
  await assertFails(getDoc(doc(b, "songs/followers")));
  await assertSucceeds(getDoc(doc(a, "songs/private")));
  await assertSucceeds(getDoc(doc(b, "songs/unlisted")));
  await assertSucceeds(
    getDocs(
      query(
        collection(b, "songs"),
        where("visibility", "==", "public"),
        where("isPublished", "==", true),
      ),
    ),
  );
  await assertFails(getDocs(collection(b, "songs")));
  await assertFails(updateDoc(doc(b, "songs/public"), { title: "Hack" }));
  await assertFails(
    setDoc(doc(a, "songs/quota-bypass"), {
      ...song("quota-bypass", "public"),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      releaseDate: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(a, "songs/public"), {
      durationSeconds: 1,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(a, "songs/public"), {
      title: "Owner",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(outsider, "songs/public"), { durationSeconds: -1 }),
  );
  await assertFails(
    updateDoc(doc(outsider, "songs/public"), { artistId: "missing" }),
  );
});
test("users cannot add unknown metadata or directly edit social counters", async () => {
  await assertFails(
    updateDoc(doc(a, "users/alice"), { unexpectedField: true }),
  );
  await assertFails(
    updateDoc(doc(a, "users/alice"), { unexpectedField: "value" }),
  );
  await assertFails(
    updateDoc(doc(a, "publicProfiles/alice"), { followerCount: 1 }),
  );
  await assertFails(
    updateDoc(doc(a, "publicProfiles/alice"), { followingCount: 1 }),
  );
  await env.withSecurityRulesDisabled(async (c) =>
    updateDoc(doc(c.firestore(), "users/alice"), { legacyPreference: "dark" }),
  );
  await assertSucceeds(
    updateDoc(doc(a, "users/alice"), {
      displayName: "New",
      updatedAt: serverTimestamp(),
    }),
  );
  const fresh = env
    .authenticatedContext("new", { email: "new@example.test" })
    .firestore();
  const values = {
    ...user("new"),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertFails(
    setDoc(doc(fresh, "users/new"), { ...values, unexpectedField: "value" }),
  );
  await assertSucceeds(setDoc(doc(fresh, "users/new"), values));
});
function follow(db, uid, target, delta) {
  const batch = writeBatch(db);
  const relation = doc(db, "users/" + uid + "/following/" + target);
  if (delta === 1)
    batch.set(relation, { userId: target, followedAt: serverTimestamp() });
  else batch.delete(relation);
  batch.update(doc(db, "publicProfiles/" + uid), {
    followingCount: delta === 1 ? 1 : 0,
    lastFollowingId: target,
  });
  batch.update(doc(db, "publicProfiles/" + target), {
    followerCount: delta === 1 ? 1 : 0,
  });
  return batch.commit();
}
test("follow and social counters are backend-only; server relations control follower media", async () => {
  await assertFails(
    setDoc(doc(b, "users/bob/following/alice"), {
      userId: "alice",
      followedAt: serverTimestamp(),
    }),
  );
  await assertFails(follow(b, "bob", "alice", 1));
  await env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore(), "users/bob/following/alice"), {
      userId: "alice",
      followedAt: old,
    }),
  );
  await assertSucceeds(getDoc(doc(b, "songs/followers")));
  await assertFails(follow(b, "bob", "alice", -1));
  await env.withSecurityRulesDisabled(async (c) =>
    deleteDoc(doc(c.firestore(), "users/bob/following/alice")),
  );
  await assertFails(getDoc(doc(b, "songs/followers")));
  await assertFails(follow(a, "bob", "alice", 1));
  await assertFails(follow(a, "alice", "alice", 1));
});
test("favorites can only be read by owner and all client mutations are denied", async () => {
  await assertFails(
    setDoc(doc(b, "users/bob/favorites/public"), {
      songId: "public",
      favoritedAt: serverTimestamp(),
    }),
  );
  await env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore(), "users/bob/favorites/public"), {
      songId: "public",
      favoritedAt: old,
    }),
  );
  await assertSucceeds(getDoc(doc(b, "users/bob/favorites/public")));
  await assertFails(getDoc(doc(a, "users/bob/favorites/public")));
  await assertFails(deleteDoc(doc(a, "users/bob/favorites/public")));
  await assertFails(deleteDoc(doc(b, "users/bob/favorites/public")));
  await assertFails(
    setDoc(doc(b, "users/bob/favorites/private"), {
      songId: "private",
      favoritedAt: serverTimestamp(),
    }),
  );
});
test("playlist CRUD enforces schema, identity, unique readable IDs and ownership", async () => {
  await assertFails(getDoc(doc(b, "users/alice/playlists/p")));
  await assertSucceeds(
    updateDoc(doc(a, "users/alice/playlists/p"), {
      songIds: ["public"],
      songCount: 1,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(a, "users/alice/playlists/p"), {
      songIds: ["public", "public"],
      songCount: 2,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(a, "users/alice/playlists/p"), {
      songIds: ["missing"],
      songCount: 1,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(a, "users/alice/playlists/p"), {
      songIds: [],
      songCount: 0,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(b, "users/alice/playlists/p"), {
      name: "Hack",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(deleteDoc(doc(a, "users/alice/playlists/p")));
});
test("playback histories, receipts and count increments are server-only", async () => {
  await assertFails(setDoc(doc(b, "users/bob/history/new"), history("new")));
  await assertSucceeds(getDoc(doc(a, "users/alice/history/h")));
  await assertFails(getDoc(doc(b, "users/alice/history/h")));
  await assertFails(
    updateDoc(doc(a, "users/alice/history/h"), {
      listenedSeconds: 100,
      completed: true,
    }),
  );
  await assertFails(deleteDoc(doc(a, "users/alice/history/h")));
  const batch = writeBatch(a);
  batch.update(doc(a, "users/alice/history/h"), {
    counted: true,
    listenedSeconds: 65,
    playedAt: serverTimestamp(),
  });
  batch.update(doc(a, "songs/public"), {
    playCount: 1,
    lastPlayUid: "alice",
    lastPlayHistoryId: "h",
  });
  batch.set(doc(a, "users/alice/playReceipts/public"), {
    historyId: "h",
    countedAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
  await assertFails(updateDoc(doc(a, "songs/public"), { playCount: 1 }));
  await assertFails(
    setDoc(doc(a, "users/alice/playReceipts/public"), {
      historyId: "h",
      countedAt: serverTimestamp(),
    }),
  );
});

test("feed and comments are backend-written; signed readers cannot mutate even their own content", async () => {
  const post = {
    ownerId: "alice",
    authorName: "Alice",
    content: "Post",
    songId: "public",
    active: true,
    createdAt: old,
  };
  const comment = {
    ownerId: "bob",
    authorName: "Bob",
    content: "Comment",
    createdAt: old,
  };
  await assertFails(
    setDoc(doc(a, "posts/new"), { ...post, createdAt: serverTimestamp() }),
  );
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "posts/p"), post);
    await setDoc(doc(c.firestore(), "posts/p/comments/c"), comment);
  });
  await assertSucceeds(getDoc(doc(b, "posts/p")));
  await assertSucceeds(getDoc(doc(a, "posts/p/comments/c")));
  await assertFails(updateDoc(doc(a, "posts/p"), { content: "Edit" }));
  await assertFails(updateDoc(doc(a, "posts/p"), { active: false }));
  await assertFails(deleteDoc(doc(a, "posts/p")));
  await assertFails(
    setDoc(doc(b, "posts/p/comments/new"), {
      ...comment,
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(b, "posts/p/comments/c"), { content: "Edit" }),
  );
  await assertFails(deleteDoc(doc(b, "posts/p/comments/c")));
  await env.withSecurityRulesDisabled(async (c) =>
    updateDoc(doc(c.firestore(), "posts/p"), { active: false }),
  );
  await assertFails(getDocs(collection(b, "posts/p/comments")));
});
