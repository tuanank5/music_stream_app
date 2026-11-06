const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequestCache } = require("../src/utils/createRequest.ts");
const { createRequestId } = require("../tools/backend/create-request.cjs");

test("create request cache reuses failed submission key and isolates edits/accounts/form sessions", () => {
  let sequence = 0;
  const cache = createRequestCache(() => String(++sequence));
  const first = cache.key("alice", { name: "List", isPublic: false });
  assert.equal(cache.key("alice", { name: "List", isPublic: false }), first);
  assert.notEqual(cache.key("alice", { name: "List", isPublic: true }), first);
  const other = cache.key("bob", { name: "List", isPublic: true });
  assert.notEqual(cache.key("alice", { name: "List", isPublic: true }), other);
  const previous = cache.key("alice", { name: "List", isPublic: true });
  cache.reset();
  assert.notEqual(
    cache.key("alice", { name: "List", isPublic: true }),
    previous,
  );
});

test("server create IDs isolate user and resource scope, validate keys and retain old callers", () => {
  const req = (uid, key) => ({
    auth: { uid },
    headers: key === undefined ? {} : { "idempotency-key": key },
  });
  const first = createRequestId(req("alice", "retry-1"), "albums");
  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(createRequestId(req("alice", "retry-1"), "albums"), first);
  assert.notEqual(createRequestId(req("bob", "retry-1"), "albums"), first);
  assert.notEqual(createRequestId(req("alice", "retry-1"), "playlists"), first);
  assert.equal(createRequestId(req("alice"), "albums"), undefined);
  for (const key of ["", "bad key", "x".repeat(129), ["retry"], 5])
    assert.throws(() => createRequestId(req("alice", key), "albums"), {
      status: 400,
    });
});
