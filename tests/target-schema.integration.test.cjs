const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { once } = require("node:events");
const path = require("node:path");
const fs = require("node:fs");
const admin = createRequire(require.resolve("../tools/package.json"));
const { initializeApp, deleteApp } = admin("firebase-admin/app");
const { getFirestore } = admin("firebase-admin/firestore");
const { buildFixtures } = require("../tools/local/fixtures.cjs");
const { restoreTargetSchema } = require("../tools/backend/target-restore.cjs");
const {
  migrateTargetSchema,
  TARGET_MIGRATION,
} = require("../tools/backend/target-migration.cjs");
const {
  readAuditDocuments,
  auditSchema,
  FIELDS,
} = require("../tools/backend/schema-audit.cjs");

test("target migration is atomic and target-only runtime writes exact documents without private DTO leaks", async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  const app = initializeApp(
      { projectId: "demo-target-schema" },
      `target-schema-${process.pid}`,
    ),
    db = getFirestore(app);
  const backupFile = path.resolve(`.local/target-backup-${process.pid}.json`);
  const driftBackup = path.resolve(
    `.local/target-drift-backup-${process.pid}.json`,
  );
  let server;
  try {
    const fixtures = buildFixtures().documents,
      batch = db.batch();
    for (const row of fixtures) batch.set(db.doc(row.path), row.data);
    await batch.commit();
    const listenerRef = db.doc("users/local-listener"),
      songRef = db.doc("songs/local-song-000");
    const listener = (await listenerRef.get()).data();
    await db.doc("publicProfiles/local-listener").set({
      followerCount: listener.followerCount,
      followingCount: listener.followingCount,
      displayName: "Stale name",
    });
    await listenerRef.update({ followingCount: 999, userId: "local-listener" });
    const { FieldValue } = admin("firebase-admin/firestore");
    await songRef.update({
      isPublic: FieldValue.delete(),
      visibility: "public",
      isPublished: true,
      songId: songRef.id,
      albumTitle: "Stale title",
      tags: ["old"],
    });
    for (const label of ["unlisted", "followers"])
      await db.doc(`songs/local-${label}`).update({
        isPublic: FieldValue.delete(),
        visibility: label,
        isPublished: false,
      });
    const dryRun = await migrateTargetSchema(db);
    assert.deepEqual(dryRun.errors, [], JSON.stringify(dryRun.errors));
    assert.equal(dryRun.restrictedLegacySongs, 2);
    assert.equal((await listenerRef.get()).data().followingCount, 999);
    await assert.rejects(
      migrateTargetSchema(
        { projectId: "real-project" },
        { apply: true, maintenance: true, backupFile },
      ),
      /Cloud apply is not supported/,
    );
    const changedDb = {
      projectId: db.projectId,
      doc: db.doc.bind(db),
      getAll: db.getAll.bind(db),
      collection: db.collection.bind(db),
      collectionGroup: db.collectionGroup.bind(db),
      async runTransaction(callback) {
        await songRef.update({ description: "Changed after backup" });
        return db.runTransaction(callback);
      },
    };
    await assert.rejects(
      migrateTargetSchema(changedDb, {
        apply: true,
        maintenance: true,
        backupFile: driftBackup,
      }),
      /Source changed after backup/,
    );
    assert.equal((await listenerRef.get()).data().followingCount, 999);
    assert.equal((await db.doc(TARGET_MIGRATION).get()).exists, false);
    const applied = await migrateTargetSchema(db, {
      apply: true,
      maintenance: true,
      backupFile,
    });
    assert.equal(applied.migrated, true);
    assert.equal(
      JSON.parse(fs.readFileSync(backupFile, "utf8")).documents.length,
      398,
    );
    const audited = auditSchema(await readAuditDocuments(db), {
      mode: "emulator",
      profileSource: "users",
      strictTarget: true,
    });
    assert.equal(audited.errors, 0, JSON.stringify(audited.issues));
    assert.equal(audited.warnings, 0);
    assert.equal(
      (await listenerRef.get()).data().followingCount,
      listener.followingCount,
    );
    assert.equal(
      (await songRef.get()).data().description,
      "Changed after backup",
    );
    assert.equal(
      (await db.doc("songs/local-unlisted").get()).data().isPublic,
      false,
    );
    const rerun = await migrateTargetSchema(db, {
      apply: true,
      maintenance: true,
      backupFile,
    });
    assert.equal(rerun.changes.length, 0);
    assert.equal(
      (await restoreTargetSchema(db, { backupFile })).restorable,
      true,
    );
    assert.equal(
      (
        await restoreTargetSchema(db, {
          apply: true,
          maintenance: true,
          backupFile,
        })
      ).restored,
      true,
    );
    assert.equal((await listenerRef.get()).data().followingCount, 999);
    assert.equal((await songRef.get()).data().visibility, "public");
    assert.equal((await db.doc(TARGET_MIGRATION).get()).exists, false);
    await migrateTargetSchema(db, {
      apply: true,
      maintenance: true,
      backupFile: backupFile + ".reapply.json",
    });
    const { createBackend } = require("../tools/backend/service.cjs");
    server = await createBackend({
      db,
      auth: { verifyIdToken: async () => ({ uid: "local-listener" }) },
      projectId: db.projectId,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = {
      Authorization: "Bearer emulator-test",
      "Content-Type": "application/json",
    };
    const request = (method, route, data) =>
      fetch(base + route, {
        method,
        headers,
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
    const publicSong = await (
      await request("GET", "/songs/local-song-000")
    ).json();
    assert.equal(publicSong.isPublic, true);
    assert.equal(publicSong.album, "Album local 1");
    assert.equal(publicSong.visibility, undefined);
    assert.equal(publicSong.isPublished, undefined);
    assert.equal(publicSong.audioPublicId, undefined);
    for (const label of ["private", "unlisted", "followers"])
      assert.equal((await request("GET", `/songs/local-${label}`)).status, 403);
    const exactFields = async (ref, kind) =>
      assert.deepEqual(
        Object.keys((await ref.get()).data()).sort(),
        FIELDS[kind].split(" ").sort(),
        ref.path,
      );
    const albumResponse = await request("POST", "/albums", {
      title: "Exact album",
      description: "",
      coverUrl: "",
      isPublic: false,
    });
    assert.equal(albumResponse.status, 201);
    const albumId = (await albumResponse.json()).id;
    await exactFields(db.doc(`albums/${albumId}`), "albums");
    await assert.rejects(
      restoreTargetSchema(db, { apply: true, maintenance: true, backupFile }),
      /Data changed after migration/,
    );
    const playlistResponse = await request("POST", "/playlists", {
      name: "Exact list",
      description: "",
      isPublic: true,
    });
    assert.equal(playlistResponse.status, 201);
    const playlistId = (await playlistResponse.json()).id;
    await exactFields(
      db.doc(`users/local-listener/playlists/${playlistId}`),
      "playlists",
    );
    assert.equal(
      (await request("PUT", `/playlists/${playlistId}/songs/local-song-000`))
        .status,
      200,
    );
    await exactFields(
      db.doc(`users/local-listener/playlists/${playlistId}`),
      "playlists",
    );
    assert.equal(
      (await request("PUT", "/favorites/local-song-000")).status,
      200,
    );
    await exactFields(
      db.doc("users/local-listener/favorites/local-song-000"),
      "favorites",
    );
    const postResponse = await request("POST", "/posts", {
      content: "Exact post",
      songId: "",
    });
    assert.equal(postResponse.status, 201);
    const postId = (await postResponse.json()).id;
    await exactFields(db.doc(`posts/${postId}`), "posts");
    assert.equal((await db.doc(`posts/${postId}`).get()).data().songId, null);
    const commentResponse = await request("POST", `/posts/${postId}/comments`, {
      content: "Exact comment",
    });
    assert.equal(commentResponse.status, 201);
    const commentId = (await commentResponse.json()).id;
    await exactFields(
      db.doc(`posts/${postId}/comments/${commentId}`),
      "comments",
    );
    const session = "target-schema-history-session";
    assert.equal(
      (
        await request("POST", `/playback/${session}`, {
          songId: "local-song-001",
          sequence: 0,
          progressSeconds: 0,
          ranges: [],
        })
      ).status,
      200,
    );
    await exactFields(
      db.doc(`users/local-listener/history/${session}`),
      "history",
    );
    const {
      createOwnedSong,
      validateSongInput,
    } = require("../tools/backend/song-create.cjs");
    const input = validateSongInput({
      requestId: "target-schema-song-create",
      title: "Exact song",
      artistNames: ["One", "Two"],
      albumId,
      coverUrl: "",
      genre: ["Pop"],
      lyric: "",
      description: "",
      isPublic: false,
      audioPublicId: "musicstream/local-listener/audio/test",
    });
    await createOwnedSong(db, "local-listener", input, {
      url: "https://example.test/verified.wav",
      duration: 45,
    });
    await exactFields(db.doc(`songs/${input.requestId}`), "songs");
    await assert.rejects(
      createOwnedSong(
        db,
        "local-listener",
        { ...input, title: "Changed retry" },
        { url: "https://example.test/verified.wav", duration: 45 },
      ),
      { status: 409 },
    );
    const whole = auditSchema(await readAuditDocuments(db), {
      mode: "emulator",
      profileSource: "users",
      strictTarget: true,
    });
    assert.equal(whole.errors, 0, JSON.stringify(whole.issues));
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await deleteApp(app);
  }
});
