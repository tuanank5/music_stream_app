const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const admin = createRequire(require.resolve("../tools/package.json"));
const { initializeApp, deleteApp } = admin("firebase-admin/app");
const { getFirestore, Timestamp } = admin("firebase-admin/firestore");
const { migrateProfiles } = require("../tools/backend/profile-migration.cjs");
const {
  assertProfilesReady,
  PROFILE_MIGRATION,
} = require("../tools/backend/profiles.cjs");

test("profile migration backs up, rejects drift atomically, preserves metadata and boots users-only backend", async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST,
    "Run via isolated Emulator suite.",
  );
  const app = initializeApp(
    { projectId: "demo-profile-migration" },
    `profile-migration-${process.pid}`,
  );
  const db = getFirestore(app),
    time = Timestamp.now();
  const backupFile = path.resolve(`.local/profiles-backup-${process.pid}.json`);
  const changedBackup = path.resolve(
    `.local/profiles-changed-backup-${process.pid}.json`,
  );
  let server;
  try {
    const batch = db.batch();
    for (const uid of ["alice", "bob"]) {
      batch.set(db.doc(`users/${uid}`), {
        userId: uid,
        displayName: `Current ${uid}`,
        email: `${uid}@private.test`,
        biography: "Keep biography",
        avatarUrl: "",
        active: true,
        followerCount: 99,
        followingCount: 99,
        createdAt: time,
        updatedAt: time,
      });
      batch.set(db.doc(`publicProfiles/${uid}`), {
        displayName: "Stale name",
        followerCount: uid === "bob" ? 1 : 0,
        followingCount: uid === "alice" ? 1 : 0,
      });
    }
    batch.set(db.doc("users/alice/following/bob"), {
      userId: "bob",
      followedAt: time,
    });
    await batch.commit();
    const before = (await db.doc("users/alice").get()).data();
    const dryRun = await migrateProfiles(db);
    assert.equal(dryRun.mode, "dry-run");
    assert.deepEqual(dryRun.errors, []);
    assert.equal(
      dryRun.reconciliation.find((p) => p.uid === "alice").followingCount,
      1,
    );
    assert.deepEqual((await db.doc("users/alice").get()).data(), before);
    await assert.rejects(assertProfilesReady(db), /Legacy publicProfiles/);
    await assert.rejects(
      migrateProfiles(
        { projectId: "real-project" },
        { apply: true, backupFile, maintenance: true },
      ),
      /cloud apply is not supported/,
    );
    const changedDb = {
      projectId: db.projectId,
      doc: db.doc.bind(db),
      collection: db.collection.bind(db),
      collectionGroup: db.collectionGroup.bind(db),
      async runTransaction(callback) {
        await db
          .doc("users/alice")
          .update({ biography: "Changed after backup" });
        return db.runTransaction(callback);
      },
    };
    await assert.rejects(
      migrateProfiles(changedDb, {
        apply: true,
        maintenance: true,
        backupFile: changedBackup,
      }),
      /Source changed after backup/,
    );
    assert.equal((await db.doc("users/alice").get()).data().followingCount, 99);
    assert.equal((await db.doc(PROFILE_MIGRATION).get()).exists, false);
    const applied = await migrateProfiles(db, {
      apply: true,
      maintenance: true,
      backupFile,
    });
    assert.equal(applied.migrated, true);
    const backup = JSON.parse(fs.readFileSync(backupFile, "utf8"));
    assert.equal(backup.projectId, "demo-profile-migration");
    assert.equal(backup.documents.length, 5);
    assert.equal(
      backup.documents.find((row) => row.path === "users/alice").data
        .followingCount,
      99,
    );
    assert.equal(backup.documents[0].data.createdAt.__type, "timestamp");
    const alice = (await db.doc("users/alice").get()).data();
    assert.equal(alice.followingCount, 1);
    assert.equal(alice.followerCount, 0);
    assert.equal(alice.userId, undefined);
    assert.equal(alice.displayName, "Current alice");
    assert.equal(alice.email, "alice@private.test");
    assert.equal(alice.biography, "Changed after backup");
    assert.equal(alice.createdAt.toMillis(), time.toMillis());
    assert.equal(alice.updatedAt.toMillis(), time.toMillis());
    const relation = (await db.doc("users/alice/following/bob").get()).data();
    assert.deepEqual(Object.keys(relation), ["followedAt"]);
    assert.equal(relation.followedAt.toMillis(), time.toMillis());
    assert.equal((await db.collection("publicProfiles").get()).size, 2);
    await db.doc("publicProfiles/alice").update({ followingCount: 999 });
    const rerun = await migrateProfiles(db, {
      apply: true,
      maintenance: true,
      backupFile,
    });
    assert.equal(rerun.writes, 0);
    assert.deepEqual(rerun.errors, []);
    assert.equal((await db.doc("users/alice").get()).data().followingCount, 1);
    await assertProfilesReady(db);
    const { createBackend } = require("../tools/backend/service.cjs");
    server = await createBackend({
      db,
      auth: { verifyIdToken: async () => ({ uid: "alice" }) },
      projectId: db.projectId,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = { Authorization: "Bearer test-emulator-token" };
    const response = await fetch(base + "/profiles/alice", { headers });
    assert.equal(response.status, 200);
    const profile = await response.json();
    assert.equal(profile.name, "Current alice");
    assert.equal(profile.followingCount, 1);
    assert.equal(profile.email, undefined);
    assert.equal(
      (await fetch(base + "/following/bob", { method: "DELETE", headers }))
        .status,
      200,
    );
    assert.equal((await db.doc("users/alice").get()).data().followingCount, 0);
    assert.equal((await db.doc("users/bob").get()).data().followerCount, 0);
    assert.equal(
      (await db.doc("publicProfiles/alice").get()).data().followingCount,
      999,
    );
    assert.equal((await migrateProfiles(db)).errors.length, 0);
    const {
      auditSchema,
      readAuditDocuments,
    } = require("../tools/backend/schema-audit.cjs");
    const auditDocuments = await readAuditDocuments(db);
    assert.equal(
      auditSchema(auditDocuments, { profileSource: "users" }).errors,
      0,
    );
    assert.ok(
      auditSchema(auditDocuments).errors > 0,
      "Legacy source would incorrectly select stale projections.",
    );
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    await deleteApp(app);
  }
});
