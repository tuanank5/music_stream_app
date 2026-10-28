const { test, before, after } = require("node:test");
const { readFileSync } = require("node:fs");
const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} = require("firebase/firestore");
let env;
let a, b, root, guest;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-music-stream",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
  a = env
    .authenticatedContext("alice", { email: "alice@example.com" })
    .firestore();
  b = env.authenticatedContext("bob", { email: "bob@example.com" }).firestore();
  root = env
    .authenticatedContext("root", { admin: true, email: "root@example.com" })
    .firestore();
  guest = env.unauthenticatedContext().firestore();
  await env.withSecurityRulesDisabled(async (c) => {
    const db = c.firestore();
    await setDoc(doc(db, "artists/a1"), {
      name: "Demo",
      imageUrl: "",
      biography: "",
      active: true,
    });
    await setDoc(doc(db, "songs/s1"), {
      title: "Demo",
      artist: "Demo",
      artistId: "a1",
      album: "",
      coverUrl: "",
      audioUrl: "",
      audioKey: "demo1",
      durationSeconds: 12,
      lyrics: "",
      active: true,
    });
    await setDoc(doc(db, "users/alice/playlists/p1"), {
      name: "A",
      description: "",
      songIds: [],
    });
  });
});
after(async () => {
  if (env) await env.cleanup();
});
test("Danh mục công khai đọc được", async () =>
  assertSucceeds(getDoc(doc(guest, "songs/s1"))));
test("Người dùng thường không sửa danh mục", async () =>
  assertFails(updateDoc(doc(a, "songs/s1"), { title: "Hack" })));
test("Admin cập nhật bài hợp lệ", async () =>
  assertSucceeds(updateDoc(doc(root, "songs/s1"), { title: "Updated" })));
test("Admin cũng không ghi dữ liệu sai kiểu", async () =>
  assertFails(updateDoc(doc(root, "songs/s1"), { durationSeconds: -2 })));
test("Admin không thêm artistId không tồn tại", async () =>
  assertFails(updateDoc(doc(root, "songs/s1"), { artistId: "missing" })));
test("Không đọc playlist người khác", async () =>
  assertFails(getDoc(doc(b, "users/alice/playlists/p1"))));
test("Chủ sở hữu thêm/xóa bài trong playlist", async () => {
  await assertSucceeds(
    updateDoc(doc(a, "users/alice/playlists/p1"), { songIds: ["s1"] }),
  );
  await assertSucceeds(
    updateDoc(doc(a, "users/alice/playlists/p1"), { songIds: [] }),
  );
});
test("Từ chối bài không tồn tại hoặc sai kiểu trong playlist", async () => {
  await assertFails(
    updateDoc(doc(a, "users/alice/playlists/p1"), { songIds: ["missing"] }),
  );
  await assertFails(
    updateDoc(doc(a, "users/alice/playlists/p1"), { songIds: [123] }),
  );
});
test("Không tạo playlist có tên rỗng", async () =>
  assertFails(
    setDoc(doc(a, "users/alice/playlists/bad"), {
      name: "",
      description: "",
      songIds: [],
    }),
  ));
test("Không tự gán role admin trong profile", async () =>
  assertFails(
    setDoc(doc(a, "users/alice"), {
      displayName: "Alice",
      email: "alice@example.com",
      photoURL: "",
      role: "admin",
    }),
  ));
test("Favorite chỉ owner được thêm/xóa", async () => {
  await assertSucceeds(
    setDoc(doc(a, "users/alice/favorites/s1"), { songId: "s1" }),
  );
  await assertFails(deleteDoc(doc(b, "users/alice/favorites/s1")));
  await assertSucceeds(deleteDoc(doc(a, "users/alice/favorites/s1")));
});
test("Không giả mạo ownerId trong post", async () =>
  assertFails(
    setDoc(doc(a, "posts/fake"), {
      ownerId: "bob",
      authorName: "B",
      content: "Hello",
      songId: "",
      active: true,
      createdAt: serverTimestamp(),
    }),
  ));
test("Post/comment tạo, sửa, xóa có kiểm tra owner", async () => {
  await assertSucceeds(
    setDoc(doc(a, "posts/post1"), {
      ownerId: "alice",
      authorName: "Alice",
      content: "Hello",
      songId: "s1",
      active: true,
      createdAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    setDoc(doc(b, "posts/post1/comments/c1"), {
      ownerId: "bob",
      authorName: "Bob",
      content: "Hi",
      createdAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(a, "posts/post1/comments/c1"), { content: "Hack" }),
  );
  await assertSucceeds(
    updateDoc(doc(b, "posts/post1/comments/c1"), { content: "New" }),
  );
  await assertSucceeds(deleteDoc(doc(b, "posts/post1/comments/c1")));
});
