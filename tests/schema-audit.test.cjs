const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const admin = createRequire(require.resolve("../tools/package.json"));
const { Timestamp } = admin("firebase-admin/firestore");
const {
  auditSchema,
  readAuditDocuments,
} = require("../tools/backend/schema-audit.cjs");
const { parseArguments } = require("../tools/audit-target-schema.cjs");
const time = Timestamp.fromMillis(1700000000000);
const user = (displayName) => ({
  displayName,
  email: "private@example.test",
  avatarUrl: "",
  avatarPublicId: null,
  biography: "",
  followerCount: 0,
  followingCount: 0,
  active: true,
  createdAt: time,
  updatedAt: time,
});
const song = () => ({
  title: "Audio",
  artistId: "artist",
  artistNames: ["Artist"],
  albumId: null,
  coverUrl: "",
  coverPublicId: null,
  audioUrl: "https://example.test/audio.wav",
  audioPublicId: null,
  durationSeconds: 45,
  genre: ["Pop"],
  lyric: "",
  description: "",
  isPublic: true,
  active: true,
  playCount: 0,
  releaseDate: time,
  createdAt: time,
  updatedAt: time,
});
function fixture() {
  return [
    { path: "users/artist", data: user("Artist") },
    { path: "users/listener", data: user("Listener") },
    { path: "songs/song", data: song() },
  ];
}
const codes = (report) => report.issueCounts;

test("schema audit accepts target data without mutating it or exposing profile values", () => {
  const input = fixture();
  const before = JSON.stringify(input);
  const report = auditSchema(input);
  assert.equal(report.errors, 0);
  assert.equal(report.dataValid, true);
  assert.equal(report.readyToApply, false);
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(report).includes("private@example.test"), false);
});

test("schema audit preserves canonical public counters and reconciles all incoming/outgoing links", () => {
  const input = fixture();
  input[0].data.active = false; // Inactive relations still count.
  input.push(
    {
      path: "publicProfiles/artist",
      data: { ...user("Artist"), active: false, followerCount: 1 },
    },
    {
      path: "publicProfiles/listener",
      data: { ...user("Listener"), followingCount: 1 },
    },
    {
      path: "users/listener/following/artist",
      data: { userId: "artist", followedAt: time },
    },
  );
  const report = auditSchema(input);
  assert.equal(report.errors, 0);
  assert.equal(codes(report).stale_user_counters, 2);
  assert.equal(
    report.profileReconciliation.find((p) => p.uid === "artist").source,
    "publicProfiles",
  );
  input.at(-3).data.followerCount = 2;
  assert.equal(codes(auditSchema(input)).counter_relation_mismatch, 1);
  input.at(-3).data.followerCount = -1;
  assert.equal(codes(auditSchema(input)).invalid_counter, 1);
});

test("schema audit never promotes followers/unlisted/private or silently resolves contradictory privacy", () => {
  for (const visibility of ["followers", "unlisted", "private"]) {
    const input = fixture();
    delete input[2].data.isPublic;
    Object.assign(input[2].data, { visibility, isPublished: false });
    const report = auditSchema(input);
    assert.equal(report.errors, 0);
    assert.equal(
      report.legacyPrivacyDocuments,
      visibility === "private" ? 0 : 1,
    );
    input[2].data.isPublic = true;
    assert.equal(codes(auditSchema(input)).conflicting_privacy, 1);
  }
  const input = fixture();
  delete input[2].data.isPublic;
  assert.equal(codes(auditSchema(input)).ambiguous_privacy, 1);
});

test("schema audit blocks missing audio instead of using audioKey and restricts demo URLs to emulator", () => {
  const input = fixture();
  delete input[2].data.audioUrl;
  input[2].data.audioKey = "demo1";
  let report = auditSchema(input);
  assert.equal(report.songsMissingAudioUrl, 1);
  assert.equal(report.legacyFieldsToRemove["songs.audioKey"], 1);
  input[2].data.audioUrl = "/local-audio/sample-short.wav";
  assert.equal(codes(auditSchema(input)).invalid_media_url, 1);
  assert.equal(auditSchema(input, { mode: "emulator" }).errors, 0);
  input[2].data.audioUrl = "/local-audio/arbitrary.wav";
  report = auditSchema(input, { mode: "emulator" });
  assert.equal(codes(report).invalid_media_url, 1);
});

test("schema audit detects orphaned parents, mismatched IDs, self follows and unknown fields", () => {
  const input = fixture();
  input.push(
    { path: "publicProfiles/ghost", data: {} },
    { path: "users/ghost/following/artist", data: { followedAt: time } },
    { path: "users/artist/following/artist", data: { followedAt: time } },
    {
      path: "users/listener/following/artist",
      data: { userId: "other", followedAt: time },
    },
  );
  input[2].data.songId = "other";
  input[2].data.unreviewed = "preserve-me";
  const report = auditSchema(input);
  assert.equal(codes(report).orphan_public_profile, 1);
  assert.equal(codes(report).orphan_parent, 1);
  assert.equal(codes(report).invalid_follow_relation, 2);
  assert.equal(codes(report).relation_id_conflict, 1);
  assert.equal(codes(report).unreviewed_field, 1);
  assert.ok(codes(report).duplicate_id_conflict >= 1);
});

test("schema audit validates album ownership, genre and ordered playlist bounds without splitting data", () => {
  const input = fixture();
  input[2].data.albumId = "album";
  input[2].data.genre = ["Nhạc Trịnh"];
  input.push(
    {
      path: "albums/album",
      data: {
        title: "Album",
        artistId: "listener",
        coverUrl: "",
        coverPublicId: null,
        description: "",
        isPublic: false,
        createdAt: time,
        updatedAt: time,
        releaseDate: time,
      },
    },
    {
      path: "users/listener/playlists/list",
      data: {
        name: "List",
        description: "",
        isPublic: true,
        songIds: Array(51).fill("song"),
        createdAt: time,
        updatedAt: time,
      },
    },
  );
  const report = auditSchema(input);
  assert.equal(codes(report).invalid_album_link, 1);
  assert.equal(codes(report).invalid_genres, 1);
  assert.equal(codes(report).invalid_playlist_membership, 1);
});

test("schema audit preserves retention semantics and rejects corrupt history/timestamps", () => {
  const input = fixture();
  input.push(
    {
      path: "users/listener/playReceipts/song",
      data: { historyId: "pruned", countedAt: time },
    },
    {
      path: "users/listener/history/session",
      data: {
        songId: "song",
        playedAt: time,
        startedAt: Timestamp.fromMillis(time.toMillis() + 1000),
        durationSeconds: 45,
        progressSeconds: 46,
        listenedSeconds: 60,
        counted: true,
        completed: false,
      },
    },
  );
  const report = auditSchema(input);
  assert.equal(codes(report).receipt_history_pruned, 1);
  assert.equal(codes(report).history_progress_exceeds_duration, 1);
  assert.equal(codes(report).history_time_order, 1);
  // Listening to a section twice may legitimately exceed the media duration.
  assert.equal(codes(report).invalid_history_number, undefined);
  input[0].data.createdAt = "2026-01-01";
  assert.equal(codes(auditSchema(input)).missing_or_invalid_timestamp, 1);
});

test("schema audit caps issue details but keeps complete counts and refuses duplicate paths", () => {
  const input = fixture();
  input[2].data.genre = [];
  input[2].data.durationSeconds = -1;
  const report = auditSchema(input, { maxIssues: 1 });
  assert.equal(report.issues.length, 1);
  assert.equal(report.issuesTruncated, true);
  assert.equal(codes(report).invalid_genres, 1);
  assert.equal(codes(report).invalid_duration, 1);
  assert.throws(() => auditSchema([...input, input[0]]), /Duplicate/);
});

test("audit reader paginates roots/groups including orphan children using only read methods", async () => {
  const seen = [],
    cursors = [];
  const row = (path) => ({ ref: { path }, data: () => ({}) });
  const db = {
    collection: (name) => query(false, name),
    collectionGroup: (name) => query(true, name),
  };
  function query(group, name) {
    let after;
    return {
      orderBy() {
        return this;
      },
      limit() {
        return this;
      },
      startAfter(doc) {
        after = doc;
        cursors.push(doc.ref.path);
        return this;
      },
      async get() {
        seen.push(`${group ? "group" : "root"}:${name}`);
        const docs =
          name === "users" && !after
            ? [row("users/artist"), row("users/listener")]
            : name === "comments"
              ? [row("posts/missing/comments/orphan")]
              : [];
        return { docs, size: docs.length };
      },
    };
  }
  const docs = await readAuditDocuments(db, { pageSize: 2 });
  assert.equal(docs.length, 3);
  assert.deepEqual(cursors, ["users/listener"]);
  assert.ok(seen.includes("group:following"));
  assert.ok(seen.includes("group:comments"));
  await assert.rejects(
    readAuditDocuments(db, { pageSize: 2, maxDocuments: 1 }),
    /no complete report/,
  );
});

test("audit CLI requires an explicit source and refuses apply/ambiguous or incomplete arguments", () => {
  for (const args of [
    [],
    ["--apply"],
    ["--local", "--project", "real-project"],
    ["--project"],
    ["--project", "demo-test"],
    ["--fixtures", "--report"],
    ["--local", "--local"],
  ])
    assert.throws(() => parseArguments(args));
  assert.deepEqual(
    parseArguments(["--fixtures", "--report", ".local/report.json"]),
    { "--fixtures": true, "--report": ".local/report.json" },
  );
});
