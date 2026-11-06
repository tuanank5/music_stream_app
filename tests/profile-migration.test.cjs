const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  planProfileMigration,
} = require("../tools/backend/profile-migration.cjs");
const { parseArguments } = require("../tools/backend/backfill.cjs");
const { FollowGraph } = require("../tools/backend/follow-graph.cjs");
const {
  catalogProfile,
  assertProfilesReady,
} = require("../tools/backend/profiles.cjs");
function source() {
  return [
    {
      path: "users/alice",
      data: {
        displayName: "Current Alice",
        email: "private@example.test",
        followerCount: 90,
        followingCount: 90,
      },
    },
    {
      path: "users/bob",
      data: {
        displayName: "Current Bob",
        active: false,
        followerCount: 80,
        followingCount: 80,
      },
    },
    {
      path: "publicProfiles/alice",
      data: { displayName: "Old Alice", followerCount: 0, followingCount: 1 },
    },
    {
      path: "publicProfiles/bob",
      data: { followerCount: 1, followingCount: 0 },
    },
    {
      path: "users/alice/following/bob",
      data: { followedAt: 123, userId: "bob" },
    },
  ];
}
test("profile migration plans canonical counters without moving private or stale metadata", () => {
  const input = source(),
    before = JSON.stringify(input);
  const plan = planProfileMigration(input);
  assert.equal(plan.errors.length, 0);
  assert.deepEqual(plan.plans.find((p) => p.path === "users/alice").counters, {
    followerCount: 0,
    followingCount: 1,
  });
  assert.deepEqual(plan.plans.find((p) => p.path === "users/bob").counters, {
    followerCount: 1,
    followingCount: 0,
  });
  assert.equal(JSON.stringify(input), before);
  assert.equal(JSON.stringify(plan).includes("private@example.test"), false);
  assert.ok(plan.plans.every((p) => !p.path.startsWith("publicProfiles/")));
});
test("profile migration blocks drift, orphan profiles/relations, self follow and conflicting IDs", () => {
  const input = source();
  input[3].data.followerCount = 2;
  input[4].data.userId = "other";
  input.push(
    { path: "publicProfiles/ghost", data: {} },
    { path: "users/bob/following/bob", data: {} },
  );
  const codes = planProfileMigration(input).errors.map((issue) => issue.code);
  for (const code of [
    "counter_relation_mismatch",
    "relation_id_conflict",
    "orphan_public_profile",
    "invalid_follow_relation",
  ])
    assert.ok(codes.includes(code));
  assert.throws(() => planProfileMigration([...input, input[0]]), /Duplicate/);
});
test("migrated profile plans use users and never restore stale projections on rerun", () => {
  const input = source();
  input[0].data.followerCount = 0;
  input[0].data.followingCount = 1;
  input[1].data.followerCount = 1;
  input[1].data.followingCount = 0;
  input[2].data.followingCount = 500;
  const plan = planProfileMigration(input, { migrated: true });
  assert.equal(plan.errors.length, 0);
  assert.deepEqual(plan.plans, []);
  assert.ok(
    plan.reconciliation.every((row) => row.source.startsWith("users/")),
  );
});
test("profile migration CLI rejects cloud apply before connecting and enforces explicit maintenance/backup", () => {
  for (const args of [
    [],
    [
      "--project",
      "real-project",
      "--apply",
      "--maintenance",
      "--backup",
      "file.json",
    ],
    ["--local", "--apply"],
    ["--local", "--apply", "--maintenance"],
    ["--local", "--backup"],
    ["--local", "--local"],
  ])
    assert.throws(() => parseArguments(args));
  assert.equal(
    parseArguments([
      "--local",
      "--apply",
      "--maintenance",
      "--backup",
      ".local/backup.json",
    ])["--apply"],
    true,
  );
});
test("follow graph indexes both directions from paths, ignores nested/self paths and dedupes events", () => {
  const graph = new FollowGraph(3);
  graph.change("users/alice/following/bob");
  const version = graph.version;
  graph.change("users/alice/following/bob");
  graph.change("users/alice/following/alice");
  graph.change("posts/no/following/bob");
  assert.equal(graph.version, version);
  assert.equal(graph.size, 1);
  assert.deepEqual(graph.followers("bob"), ["alice"]);
  assert.deepEqual(graph.following("alice"), ["bob"]);
  graph.change("users/alice/following/bob", true);
  assert.equal(graph.size, 0);
  assert.equal(graph.incoming.size, 0);
  assert.equal(graph.outgoing.size, 0);
  graph.change("users/alice/following/bob", true);
  assert.equal(graph.size, 0);
});
test("follow graph bounds samples and capacity and can clear state after shutdown", () => {
  const graph = new FollowGraph(60);
  for (let i = 0; i < 60; i++) graph.change(`users/fan-${i}/following/artist`);
  assert.equal(graph.followers("artist").length, 50);
  assert.throws(
    () => graph.change("users/extra/following/artist"),
    /capacity exceeded/,
  );
  assert.equal(graph.size, 60);
  assert.throws(() => graph.followers("artist", 51));
  graph.clear();
  assert.equal(graph.size, 0);
  assert.deepEqual(graph.followers("artist"), []);
});

test("catalog profile cache drops private fields while retaining current public metadata/counters", () => {
  const profile = catalogProfile({
    displayName: "Current",
    avatarUrl: "https://example.test/a.jpg",
    biography: "Bio",
    followerCount: 3,
    followingCount: 2,
    active: false,
    email: "private@example.test",
    avatarPublicId: "internal-id",
    token: "secret",
    unexpected: "value",
  });
  assert.deepEqual(Object.keys(profile).sort(), [
    "active",
    "avatarUrl",
    "biography",
    "displayName",
    "followerCount",
    "followingCount",
  ]);
  assert.equal(profile.active, false);
  assert.equal(profile.followerCount, 3);
});
test("profile startup guard accepts clean/completed stores and refuses incomplete markers", async () => {
  const fake = (status, empty) => ({
    doc: () => ({
      get: async () => ({
        exists: status !== undefined,
        data: () => ({ status }),
      }),
    }),
    collection: () => ({ limit: () => ({ get: async () => ({ empty }) }) }),
  });
  await assertProfilesReady(fake(undefined, true));
  await assertProfilesReady(fake("completed", false));
  await assert.rejects(
    assertProfilesReady(fake(undefined, false)),
    /Legacy publicProfiles/,
  );
  await assert.rejects(
    assertProfilesReady(fake("pending", true)),
    /not completed/,
  );
});

test("backend accepts an empty graph and the last complete cloud-sized graph", async () => {
  const { createBackend } = require("../tools/backend/service.cjs");
  for (const count of [0, 9999]) {
    const stopped = [];
    const query = (name) => ({
      limit(size) {
        assert.ok(size <= 10000);
        return this;
      },
      get: async () => ({ empty: true }),
      onSnapshot(next) {
        const changes =
          name === "following"
            ? Array.from({ length: count }, (_, i) => ({
                type: "added",
                doc: { ref: { path: `users/fan-${i}/following/artist` } },
              }))
            : [];
        queueMicrotask(() =>
          next({ size: changes.length, docChanges: () => changes }),
        );
        return () => stopped.push(name);
      },
    });
    const server = await createBackend({
      db: {
        doc: () => ({ get: async () => ({ exists: false }) }),
        collection: query,
        collectionGroup: query,
      },
      auth: {},
      projectId: "demo-graph-boundary",
    });
    server.emit("close");
    assert.deepEqual(
      new Set(stopped),
      new Set(["users", "following", "albums", "songs"]),
    );
  }
});

test("backend refuses a truncated graph and releases all startup listeners", async () => {
  const { createBackend } = require("../tools/backend/service.cjs");
  const stopped = [],
    limits = [];
  const query = (name) => ({
    limit(size) {
      assert.ok(size <= 10000, "Cloud Firestore rejects larger watch limits");
      limits.push([name, size]);
      return this;
    },
    get: async () => ({ empty: true }),
    onSnapshot(next) {
      queueMicrotask(() =>
        next({ size: name === "following" ? 10000 : 0, docChanges: () => [] }),
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
    createBackend({ db, auth: {}, projectId: "demo-graph-limit" }),
    /capacity exceeded/,
  );
  assert.deepEqual(
    new Set(stopped),
    new Set(["users", "following", "albums", "songs"]),
  );
  assert.ok(
    limits.some(([name, size]) => name === "following" && size === 10000),
  );
});
