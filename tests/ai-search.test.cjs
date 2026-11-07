const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./helpers/register-local.cjs");
const { createPager } = require("../src/utils/pager.ts");
const { searchStatusMessage } = require("../src/utils/searchStatus.ts");
const { preflight } = require("../tools/backend/ai/preflight.cjs");
const { startAiIndex } = require("../tools/backend/ai/bootstrap.cjs");
const { createAiSearch, vector } = require("../tools/backend/ai/search.cjs");
function fixture(limit = 10) {
  const data = new Map();
  const doc = (path) => ({
    path,
    get: async () => snap(path),
    set: async (value) => data.set(path, value),
  });
  const snap = (path) => ({
    exists: data.has(path),
    data: () => data.get(path),
  });
  let calls = 0;
  const db = {
    doc,
    getAll: async (...refs) => refs.map((r) => snap(r.path)),
    runTransaction: async (work) =>
      work({
        get: (ref) => ref.get(),
        set: (ref, value) => data.set(ref.path, value),
      }),
  };
  const env = {
    AI_ENABLED: "true",
    GEMINI_API_KEY: "test-key",
    AI_EMBEDDING_DIMENSIONS: "128",
    AI_DAILY_REQUEST_LIMIT: String(limit),
  };
  const fetchImpl = async (_url, options) => {
    calls++;
    assert.equal(options.headers["x-goog-api-key"], "test-key");
    const body = JSON.parse(options.body);
    assert.equal(body.output_dimensionality, 128);
    assert.ok(!body.taskType);
    return {
      ok: true,
      json: async () => ({ embedding: { values: [1, ...Array(127).fill(0)] } }),
    };
  };
  return { db, env, data, fetchImpl, calls: () => calls };
}
test("AI off never accesses provider or database", async () => {
  const ai = createAiSearch({
    db: null,
    env: {},
    fetchImpl: () => {
      throw Error();
    },
  });
  assert.deepEqual(await ai.rank("mưa", ["song:a"], [], "u"), {
    keys: ["song:a"],
    fallbackReason: "disabled",
  });
});
test("vectors reject corrupt values and normalize compatible dimensions", () => {
  assert.deepEqual(vector([3, 4], 2), [0.6, 0.8]);
  for (const v of [[0, 0], [NaN, 1], [Infinity, 1], [1], ["1", 2]])
    assert.throws(() => vector(v, 2));
});
test("durable index is reused by a new service and stale content hashes do not match", async () => {
  const f = fixture();
  const song = { id: "a", title: "Mưa", artist: "A", genre: ["Pop"] };
  await createAiSearch(f).index([song]);
  assert.equal(f.calls(), 1);
  const next = createAiSearch(f);
  const result = await next.rank("nhạc buồn", [], [song], "u");
  assert.deepEqual(result.keys, ["song:a"]);
  assert.equal(f.calls(), 2);
  const stale = await next.rank(
    "nhạc buồn",
    [],
    [{ ...song, title: "Nắng" }],
    "u",
  );
  assert.equal(stale.fallbackReason, "index_empty");
});
test("quota exhausted fails closed to lexical results without another provider call", async () => {
  const f = fixture(1),
    ai = createAiSearch(f);
  const song = { id: "a", title: "Mưa" };
  await ai.index([song]);
  const result = await ai.rank("mưa", ["song:a"], [song], "u");
  assert.equal(result.fallbackReason, "unavailable");
  assert.deepEqual(result.keys, ["song:a"]);
  assert.equal(f.calls(), 1);
});
test("provider failure preserves keyword results", async () => {
  const f = fixture();
  const song = { id: "a", title: "Mưa" };
  await createAiSearch(f).index([song]);
  const ai = createAiSearch({ ...f, fetchImpl: async () => ({ ok: false }) });
  assert.deepEqual(await ai.rank("mưa", ["song:a"], [song], "u"), {
    keys: ["song:a"],
    fallbackReason: "unavailable",
  });
});

test("search fallback status remains attached to the first result snapshot during pagination", async () => {
  let call = 0;
  const pager = createPager(
    async () =>
      ++call === 1
        ? {
            items: [{ id: "a" }],
            hasMore: true,
            nextCursor: "next",
            fallbackReason: "disabled",
          }
        : {
            items: [{ id: "b" }],
            hasMore: false,
            nextCursor: null,
            fallbackReason: null,
          },
    (row) => row.id,
  );
  await pager.load();
  assert.equal(pager.getSnapshot().fallbackReason, "disabled");
  await pager.load();
  assert.equal(pager.getSnapshot().fallbackReason, "disabled");
  assert.equal(pager.getSnapshot().items.length, 2);
  const next = createPager(
    async () => ({ items: [], hasMore: false, nextCursor: null }),
    (row) => row.id,
  );
  assert.equal(next.getSnapshot().fallbackReason, null);
  assert.match(searchStatusMessage("unsupported_filter"), /Bài hát/);
  assert.match(searchStatusMessage("unknown-provider-error"), /từ khóa/);
});

test("preflight requires a key and never makes an implicit inference call", async () => {
  let calls = 0;
  await assert.rejects(
    preflight({
      env: {},
      fetchImpl: async () => {
        calls++;
      },
    }),
  );
  const f = fixture();
  assert.equal((await preflight({ ...f })).inferenceVerified, false);
  assert.equal(f.calls(), 0);
  assert.equal(
    (await preflight({ ...f, smoke: true })).inferenceVerified,
    true,
  );
  assert.equal(f.calls(), 1);
  assert.equal(calls, 0);
});

test("Render startup indexing is optional, nonfatal and stoppable", async () => {
  const disabled = startAiIndex({
    ai: { enabled: false },
    getSongs: () => {
      throw Error();
    },
    isClosed: () => false,
  });
  await disabled.done;
  assert.equal(disabled.state.status, "disabled");
  const logs = [];
  const failed = startAiIndex({
    ai: {
      enabled: true,
      index: async () => {
        throw Error("secret-provider-detail");
      },
    },
    getSongs: () => [],
    isClosed: () => false,
    report: (s) => logs.push(s),
  });
  await failed.done;
  assert.equal(failed.state.status, "unavailable");
  assert.ok(!logs.join().includes("secret-provider-detail"));
  const f = fixture();
  const ai = createAiSearch(f);
  assert.equal(
    await ai.index([{ id: "a", title: "Test" }], {
      shouldContinue: () => false,
    }),
    0,
  );
  assert.equal(f.calls(), 0);
  const ready = startAiIndex({
    ai,
    getSongs: () => [{ id: "a", title: "Test" }],
    isClosed: () => false,
    report: () => {},
  });
  await ready.done;
  assert.equal(ready.state.status, "ready");
  assert.equal(ready.state.indexed, 1);
});
