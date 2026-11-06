const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { Timestamp } = createRequire(require.resolve("../tools/package.json"))(
  "firebase-admin/firestore",
);
const { auditSchema, FIELDS } = require("../tools/backend/schema-audit.cjs");
const {
  planTargetMigration,
} = require("../tools/backend/target-migration.cjs");
const { buildFixtures } = require("../tools/local/fixtures.cjs");
function fixtures() {
  const convert = (v) =>
    v instanceof Date
      ? Timestamp.fromDate(v)
      : Array.isArray(v)
        ? v.map(convert)
        : v && typeof v === "object"
          ? Object.fromEntries(
              Object.entries(v).map(([k, x]) => [k, convert(x)]),
            )
          : v;
  return buildFixtures().documents.map((row) => ({
    ...row,
    data: convert(row.data),
  }));
}
test("entire local fixture conforms exactly to target fields with no duplicated IDs/names/counts", () => {
  const docs = fixtures();
  const report = auditSchema(docs, {
    mode: "emulator",
    profileSource: "users",
    strictTarget: true,
  });
  assert.equal(report.errors, 0, JSON.stringify(report.issues));
  assert.equal(report.warnings, 0);
  for (const row of docs)
    assert.deepEqual(
      Object.keys(row.data).sort(),
      FIELDS[row.path.split("/").at(-2)].split(" ").sort(),
      row.path,
    );
  const plan = planTargetMigration(docs, { mode: "emulator" });
  assert.deepEqual(plan.errors, []);
  assert.equal(plan.changes.length, 0);
});
test("target planner normalizes legacy fields without changing IDs, dates, counters or listening state", () => {
  const docs = fixtures();
  const song = docs.find((row) => row.path === "songs/local-song-000");
  const album = docs.find((row) => row.path === "albums/local-album-0");
  const post = docs.find((row) => row.path === "posts/local-post");
  delete song.data.isPublic;
  Object.assign(song.data, {
    songId: "local-song-000",
    visibility: "public",
    isPublished: true,
    albumTitle: "Stale title",
    tags: ["legacy"],
    audioKey: "demo1",
  });
  delete album.data.isPublic;
  delete album.data.updatedAt;
  Object.assign(album.data, {
    albumId: "local-album-0",
    artistName: "Stale artist",
    isPublished: true,
  });
  post.data.authorName = "Stale author";
  const before = JSON.stringify(docs);
  const plan = planTargetMigration(docs, { mode: "emulator" });
  assert.equal(plan.errors.length, 0, JSON.stringify(plan.errors));
  const target = plan.documents.find((row) => row.path === song.path).data;
  assert.equal(target.isPublic, true);
  assert.equal(target.songId, undefined);
  assert.equal(target.albumTitle, undefined);
  assert.equal(target.audioKey, undefined);
  assert.equal(target.playCount, song.data.playCount);
  assert.equal(target.createdAt, song.data.createdAt);
  assert.equal(JSON.stringify(docs), before);
  assert.equal(plan.changes.length, 3);
});
test("legacy restricted visibility becomes private; conflicts, missing audio, unknown fields block apply", () => {
  const docs = fixtures(),
    song = docs.find((row) => row.path === "songs/local-song-000");
  delete song.data.isPublic;
  song.data.visibility = "followers";
  song.data.isPublished = false;
  let plan = planTargetMigration(docs, { mode: "emulator" });
  assert.equal(plan.errors.length, 0);
  assert.equal(
    plan.documents.find((row) => row.path === song.path).data.isPublic,
    false,
  );
  song.data.isPublic = true;
  assert.ok(
    planTargetMigration(docs, { mode: "emulator" }).errors.some(
      (e) => e.code === "conflicting_privacy",
    ),
  );
  delete song.data.isPublic;
  song.data.audioUrl = "";
  song.data.songId = "wrong-id";
  song.data.unreviewed = "must not silently discard";
  plan = planTargetMigration(docs, { mode: "emulator" });
  for (const code of [
    "missing_audio_url",
    "duplicate_id_conflict",
    "unreviewed_field",
  ])
    assert.ok(
      plan.errors.some((e) => e.code === code),
      code,
    );
});

test("backend startup rejects content without isPublic and releases listeners", async () => {
  const { createBackend } = require("../tools/backend/service.cjs");
  for (const legacyKind of ["albums", "songs"]) {
    const stopped = [];
    const query = (name) => ({
      limit() {
        return this;
      },
      get: async () => ({ empty: true }),
      onSnapshot(next) {
        queueMicrotask(() =>
          next({
            size: name === legacyKind ? 1 : 0,
            docChanges: () =>
              name === legacyKind
                ? [
                    {
                      type: "added",
                      doc: {
                        id: "legacy",
                        data: () => ({
                          visibility: "public",
                          isPublished: true,
                        }),
                      },
                    },
                  ]
                : [],
          }),
        );
        return () => stopped.push(name);
      },
    });
    const db = {
      doc: () => ({ get: async () => ({ exists: false }) }),
      collection: query,
      collectionGroup: query,
    };
    await assert.rejects(
      createBackend({ db, auth: {}, projectId: "demo-schema-guard" }),
      /Legacy .* schema found/,
    );
    assert.equal(stopped.length, 4);
  }
});
