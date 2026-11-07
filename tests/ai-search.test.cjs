const { test } = require("node:test");
const assert = require("node:assert/strict");
require("./helpers/register-local.cjs");
const { createPager } = require("../src/utils/pager.ts");
const { searchStatusMessage } = require("../src/utils/searchStatus.ts");
const { preflight } = require("../tools/backend/ai/preflight.cjs");
const { startAiIndex } = require("../tools/backend/ai/bootstrap.cjs");
const { createAiSearch, vector } = require("../tools/backend/ai/search.cjs");
const {
  createLyricGenerator,
} = require("../tools/backend/ai/lyric-generator.cjs");
const { transcribeSong } = require("../tools/backend/ai/transcribe.cjs");

test("direct ASR returns lyric text without persisting drafts, sources or songs", async () => {
  let release,
    calls = 0;
  const pending = new Promise((r) => {
    release = r;
  });
  const f = lyricFixture(async () => {
    calls++;
    return pending;
  });
  const a = f.service.generate("u", "musicstream/u/audio/asset", true);
  const b = f.service.generate("u", "musicstream/u/audio/asset", true);
  release("Lời trả trực tiếp");
  const result = await Promise.all([a, b]);
  assert.equal(calls, 1);
  assert.deepEqual(result, [
    { text: "Lời trả trực tiếp" },
    { text: "Lời trả trực tiếp" },
  ]);
  assert.ok(
    [...f.data.keys()].every(
      (path) => path.startsWith("users/") || path.startsWith("aiUsage/"),
    ),
  );
  assert.equal(
    [...f.data].find(([path]) => path.startsWith("aiUsage/"))[1].seconds,
    180,
  );
});
test("direct ASR rejects a response if account is disabled while waiting", async () => {
  let entered, release;
  const started = new Promise((r) => {
      entered = r;
    }),
    pending = new Promise((r) => {
      release = r;
    });
  const f = lyricFixture(async () => {
    entered();
    return pending;
  });
  const response = f.service.generate("u", "musicstream/u/audio/asset", true);
  await started;
  f.data.get("users/u").active = false;
  release("text");
  await assert.rejects(response, { status: 503 });
  assert.ok(
    [...f.data.keys()].every(
      (path) => path.startsWith("users/") || path.startsWith("aiUsage/"),
    ),
  );
});
test("upload lyric generation requires consent, ownership and quota before inference", async () => {
  let calls = 0;
  const f = lyricFixture(async () => {
      calls++;
      return "text";
    }, 100),
    id = "musicstream/u/audio/asset";
  await assert.rejects(f.service.generate("u", id, false), { status: 400 });
  await assert.rejects(f.service.generate("u", id, true), { status: 429 });
  await assert.rejects(
    f.service.generate("u", "musicstream/other/audio/a", true),
    { status: 403 },
  );
  assert.equal(calls, 0);
});
test("only the pre-upload lyric endpoint is exposed, post-publication edit routes are removed", async () => {
  const { createServer } = require("node:http"),
    { once } = require("node:events"),
    { createHttpApp, finishHttpApp } = require("../tools/backend/http-app.cjs");
  const f = lyricFixture(async () => "text"),
    app = createHttpApp({
      db: f.db,
      auth: { verifyIdToken: async () => ({ uid: "u" }) },
      origins: [],
      mode: "cloud",
      projectId: "test",
      isHealthy: () => true,
    });
  finishHttpApp(app);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + "/audio-lyric-config")).status, 401);
    assert.equal(
      (
        await fetch(base + "/audio-lyric-config", {
          headers: { Authorization: "Bearer u" },
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/songs/s/lyrics", {
          method: "PATCH",
          headers: { Authorization: "Bearer u" },
        })
      ).status,
      405,
    );
    assert.equal(
      (
        await fetch(base + "/songs/s/lyric-job", {
          method: "POST",
          headers: { Authorization: "Bearer u" },
        })
      ).status,
      405,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});

test("upload lyric UI fills the form but never applies stale audio or overwrites typing while waiting", async () => {
  const Module = require("node:module"),
    React = require("react"),
    { act } = React;
  const { Window } = await import("happy-dom");
  const window = new Window();
  global.window = window;
  global.document = window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const load = Module._load;
  let resolve;
  const applied = [];
  Module._load = function (request, parent, main) {
    if (parent.filename.endsWith("UploadLyricDraft.tsx")) {
      if (request === "tamagui")
        return {
          YStack: ({ children }) => React.createElement("div", null, children),
        };
      if (request === "./ui/index")
        return {
          AppText: ({ children }) =>
            React.createElement("span", null, children),
          ErrorText: ({ message }) =>
            React.createElement("span", null, message),
          Button: ({ title, onPress, disabled }) =>
            React.createElement(
              "button",
              { onClick: onPress, disabled },
              title,
            ),
        };
      if (request === "../services/backendService")
        return {
          backendGet: async () => ({ enabled: true }),
          backendPost: () =>
            new Promise((r) => {
              resolve = r;
            }),
        };
    }
    return load.call(this, request, parent, main);
  };
  const container = document.createElement("div");
  document.body.append(container);
  const root = require("react-dom/client").createRoot(container);
  const Component = require("../src/components/UploadLyricDraft.tsx").default;
  const render = (lyric) =>
    root.render(
      React.createElement(Component, {
        lyric,
        busy: false,
        prepareAudio: async () => "musicstream/u/audio/a",
        onText: (text) => applied.push(text),
      }),
    );
  const completed = {
    text: "Draft",
  };
  try {
    await act(async () => render(""));
    await act(async () => container.querySelector("button").click());
    await act(async () => render("User typed"));
    await act(async () => resolve(completed));
    assert.deepEqual(applied, []);
    assert.match(container.textContent, /Bạn đã sửa lời/);
    await act(async () =>
      [...container.querySelectorAll("button")]
        .find((b) => b.textContent === "Điền bản nháp vào ô Lời bài hát")
        .click(),
    );
    assert.deepEqual(applied, ["Draft"]);
    await act(async () => root.render(null));
    await act(async () => render(""));
    await act(async () => container.querySelector("button").click());
    await act(async () => root.render(null));
    await act(async () => resolve(completed));
    assert.deepEqual(applied, ["Draft"]);
  } finally {
    await act(async () => root.unmount());
    Module._load = load;
    container.remove();
    await window.happyDOM.close();
    delete global.window;
    delete global.document;
    delete global.IS_REACT_ACT_ENVIRONMENT;
  }
});
const {
  recommendSimilar,
  personalizeSuggestions,
} = require("../tools/backend/ai/similar.cjs");
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
    getSongs: () => [{ id: "failed-song", title: "Test" }],
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

test("overlapping semantic searches do not lock each other and queries reuse user-scoped cache", async () => {
  const f = fixture(),
    song = { id: "a", title: "Mưa" };
  const ai = createAiSearch(f);
  await ai.index([song]);
  const results = await Promise.all([
    ai.rank("nhạc buồn", [], [song], "u"),
    ai.rank("nhạc nhẹ", [], [song], "v"),
  ]);
  assert.ok(results.every((r) => r.fallbackReason === null));
  assert.equal(f.calls(), 3);
  await ai.rank("nhạc buồn", [], [song], "u");
  assert.equal(f.calls(), 3);
  await ai.rank("nhạc buồn", [], [song], "other-user");
  assert.equal(f.calls(), 4);
});

test("newer query supersedes old work before it spends query embedding quota", async () => {
  const f = fixture(),
    song = { id: "a", title: "Mưa" };
  const ai = createAiSearch(f);
  await ai.index([song]);
  const [old, fresh] = await Promise.all([
    ai.rank("old", [], [song], "u"),
    ai.rank("new", [], [song], "u"),
  ]);
  assert.equal(old.fallbackReason, "superseded");
  assert.equal(fresh.fallbackReason, null);
  assert.equal(f.calls(), 2);
});

test("live indexing handles upload, metadata changes, revocation and publication without embedding play counts", async () => {
  const f = fixture();
  let songs = [];
  const index = startAiIndex({
    ai: createAiSearch(f),
    getSongs: () => songs,
    isClosed: () => false,
    report: () => {},
  });
  await index.done;
  songs = [{ id: "new", title: "Bài mới", genre: ["Pop"] }];
  index.refresh();
  await index.flush();
  assert.equal(f.calls(), 1);
  songs = [{ ...songs[0], playCount: 999, cover: "new.jpg" }];
  index.refresh();
  await index.flush();
  assert.equal(f.calls(), 1);
  songs = [{ ...songs[0], title: "Tên mới" }];
  index.refresh();
  await index.flush();
  assert.equal(f.calls(), 2);
  // The service supplies only currently public songs; revoke removes pending
  // work without deleting content-addressed vectors another song may share.
  const publicSong = songs[0];
  songs = [];
  index.refresh();
  await index.flush();
  songs = [publicSong];
  index.refresh();
  await index.flush();
  assert.equal(f.calls(), 2);
  index.stop();
});

test("metadata edits during indexing coalesce and removed pending songs never reach provider", async () => {
  let release, started;
  const entered = new Promise((resolve) => {
    started = resolve;
  });
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  let songs = [
    { id: "a", title: "Old" },
    { id: "b", title: "Will be private" },
  ];
  const calls = [];
  const ai = {
    enabled: true,
    index: async (batch) => {
      calls.push(batch[0].title);
      if (calls.length === 1) {
        started();
        await wait;
      }
      return 1;
    },
  };
  const index = startAiIndex({
    ai,
    getSongs: () => songs,
    isClosed: () => false,
    report: () => {},
  });
  await entered;
  songs = [{ id: "a", title: "Latest" }];
  index.refresh();
  release();
  await index.done;
  assert.deepEqual(calls, ["Old", "Latest"]);
  await index.flush();
  assert.deepEqual(calls, ["Old", "Latest"]);
  index.stop();
});

test("live indexing stops a failed pass instead of calling provider for the entire catalog", async () => {
  let attempts = 0;
  const index = startAiIndex({
    ai: {
      enabled: true,
      index: async () => {
        attempts++;
        throw Error("quota");
      },
    },
    getSongs: () => [
      { id: "a", title: "A" },
      { id: "b", title: "B" },
    ],
    isClosed: () => false,
    report: () => {},
  });
  await index.done;
  assert.equal(attempts, 1);
  index.refresh();
  await index.flush();
  assert.equal(attempts, 1);
  assert.equal(index.state.status, "unavailable");
  index.stop();
});

test("similar songs use cached vectors without inference and do not return the seed or private songs", async () => {
  const f = fixture();
  const make = (id, title, artistId) => ({
    id,
    title,
    artistId,
    artist: artistId,
    genre: ["Pop"],
    active: true,
    isPublic: true,
  });
  const source = make("seed", "Seed", "artist"),
    a = make("a", "A", "one"),
    b = make("b", "B", "two");
  const ai = createAiSearch(f);
  await ai.index([source, a, b]);
  const before = f.calls();
  const result = await ai.similar(source, [
    source,
    a,
    b,
    { ...make("private", "Private", "p"), isPublic: false },
  ]);
  assert.equal(result.fallbackReason, null);
  assert.deepEqual(new Set(result.keys), new Set(["song:a", "song:b"]));
  assert.equal(f.calls(), before);
  a.title = "Changed metadata";
  const changed = await ai.similar(source, [source, a]);
  assert.equal(changed.fallbackReason, "index_empty");
  assert.equal(f.calls(), before);
});

test("similar songs fall back on missing vectors/provider storage errors and diversify artists", async () => {
  const source = {
    id: "seed",
    artistId: "a",
    genre: ["Pop"],
    active: true,
    isPublic: true,
  };
  const catalog = [
    source,
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `p${i}`,
      artistId: "a",
      genre: ["Pop"],
      playCount: 100 - i,
      active: true,
      isPublic: true,
    })),
    {
      id: "other",
      artistId: "b",
      genre: ["Pop"],
      active: true,
      isPublic: true,
    },
  ];
  const readVectors = async () => {
    throw Error("storage");
  };
  const result = await recommendSimilar({
    source,
    catalog,
    readVectors,
    enabled: true,
    limit: 4,
  });
  assert.equal(result.fallbackReason, "unavailable");
  assert.equal(result.keys[1], "song:other");
  let reads = 0;
  const disabled = await recommendSimilar({
    source,
    catalog,
    readVectors: async () => {
      reads++;
    },
    enabled: false,
  });
  assert.equal(disabled.fallbackReason, "disabled");
  assert.equal(reads, 0);
  assert.equal(
    (
      await recommendSimilar({
        source: { ...source, isPublic: false },
        catalog,
        readVectors,
        enabled: true,
      })
    ).fallbackReason,
    "source_unavailable",
  );
});

test("Suggestions for you blend saved preferences with vectors and preserve the old fallback", async () => {
  const make = (id, artistId) => ({
    id,
    artistId,
    title: id,
    genre: ["Pop"],
    active: true,
    isPublic: true,
  });
  const seed = make("seed", "s"),
    base = make("z-base", "b"),
    semantic = make("a-semantic", "c");
  const args = {
    catalog: [
      seed,
      base,
      semantic,
      { ...make("private", "p"), isPublic: false },
    ],
    baseline: [seed, base, semantic],
    history: [{ songId: "seed", completed: true }],
    favorites: ["seed"],
    following: [],
    enabled: true,
    readVectors: async (songs) => {
      assert.ok(!songs.some((s) => s.id === "private"));
      return new Map([
        ["seed", [1, 0]],
        ["z-base", [0, 1]],
        ["a-semantic", [1, 0]],
      ]);
    },
  };
  const ranked = await personalizeSuggestions(args);
  assert.equal(ranked.fallbackReason, null);
  assert.deepEqual(ranked.keys, [
    "song:seed",
    "song:a-semantic",
    "song:z-base",
  ]);
  const cold = await personalizeSuggestions({
    ...args,
    history: [],
    favorites: [],
    readVectors: async () => {
      throw Error("must not read");
    },
  });
  assert.equal(cold.fallbackReason, "no_preferences");
  assert.deepEqual(cold.keys, ["song:seed", "song:z-base", "song:a-semantic"]);
  const failed = await personalizeSuggestions({
    ...args,
    readVectors: async () => {
      throw Error("storage");
    },
  });
  assert.equal(failed.fallbackReason, "unavailable");
  assert.deepEqual(failed.keys, cold.keys);
});

test("personalized discovery uses no inference calls and never reuses another request's taste", async () => {
  const f = fixture();
  const make = (id) => ({
    id,
    title: id,
    artistId: id,
    genre: ["Pop"],
    active: true,
    isPublic: true,
  });
  const songs = [make("a"), make("b"), make("c")];
  const ai = createAiSearch(f);
  await ai.index(songs);
  const calls = f.calls();
  const first = await ai.suggest(songs, songs, [], ["a"], []);
  assert.equal(first.fallbackReason, null);
  assert.equal(f.calls(), calls);
  const next = await ai.suggest(songs, songs, [], [], []);
  assert.equal(next.fallbackReason, "no_preferences");
  assert.equal(f.calls(), calls);
});
function lyricFixture(transcribe, seconds = 600) {
  const data = new Map([["users/u", { active: true }]]);
  const snapshot = (path) => ({
    exists: data.has(path),
    data: () => structuredClone(data.get(path)),
  });
  const doc = (path) => ({ path, get: async () => snapshot(path) });
  let tail = Promise.resolve();
  const db = {
    doc,
    runTransaction: (work) => {
      const run = tail.then(async () => {
        const writes = [];
        const result = await work({
          get: (ref) => ref.get(),
          set: (ref, v) => writes.push(() => data.set(ref.path, v)),
          update: (ref, v) =>
            writes.push(() =>
              data.set(ref.path, { ...data.get(ref.path), ...v }),
            ),
        });
        writes.forEach((w) => w());
        return result;
      });
      tail = run.catch(() => {});
      return run;
    },
  };
  const env = {
    AI_ENABLED: "true",
    AI_LYRICS_ENABLED: "true",
    GEMINI_API_KEY: "test",
    AI_TRANSCRIBE_MODEL: "gemini-3.5-transcribe",
    AI_DAILY_AUDIO_SECONDS: String(seconds),
  };
  const verify = async (uid, publicId) => {
    assert.ok(publicId.startsWith("musicstream/" + uid + "/audio/"));
    return { url: "https://owned.test/audio.mp3", duration: 180 };
  };
  return {
    data,
    db,
    env,
    service: createLyricGenerator({ db, env, transcribe, verify }),
  };
}

test("transcript parser reads REST schemas without exposing input or thoughts", () => {
  const { parseTranscript } = require("../tools/backend/ai/transcribe.cjs");
  assert.equal(parseTranscript({ output_text: " Draft " }), "Draft");
  assert.equal(
    parseTranscript({
      interaction: {
        status: "completed",
        outputs: [{ type: "text", text: " Draft " }],
      },
    }),
    "Draft",
  );
  assert.equal(
    parseTranscript({
      status: "completed",
      outputs: [
        { type: "text", text: "First" },
        { type: "text", text: "Second" },
      ],
    }),
    "First\nSecond",
  );
  assert.equal(
    parseTranscript({
      output_text: "",
      steps: [
        null,
        {
          type: "user_input",
          content: [{ type: "text", text: "private input" }],
        },
        {
          type: "thought",
          content: [{ type: "text", text: "private thought" }],
        },
        {
          type: "model_output",
          content: [null, { type: "text", text: "Draft" }],
        },
      ],
    }),
    "Draft",
  );
  for (const [response, reason] of [
    [null, "INVALID_RESPONSE"],
    [
      { interaction: { status: "failed", output_text: "partial" } },
      "NOT_COMPLETED",
    ],
    [
      { status: "failed", interaction: { output_text: "partial" } },
      "NOT_COMPLETED",
    ],
    [{ status: "failed", output_text: "partial" }, "NOT_COMPLETED"],
    [
      { status: "in_progress", outputs: [{ type: "text", text: "partial" }] },
      "NOT_COMPLETED",
    ],
    [{ unknown: "private result" }, "UNSUPPORTED_RESPONSE"],
    [{ steps: [{ type: "model_output", content: {} }] }, "EMPTY_TRANSCRIPT"],
    [{ output_text: "  " }, "EMPTY_TRANSCRIPT"],
    [{ output_text: "a".repeat(12001) }, "TRANSCRIPT_TOO_LONG"],
  ]) {
    assert.throws(
      () => parseTranscript(response),
      (error) => {
        assert.equal(error.parseReason, reason);
        assert.equal(error.message, "Invalid transcription result");
        return true;
      },
    );
  }
});

test("lyric parser diagnostics log schema types without private values or unknown field names", async () => {
  const { parseTranscript } = require("../tools/backend/ai/transcribe.cjs");
  const logs = [];
  const f = lyricFixture(async () => "unused");
  const service = createLyricGenerator({
    db: f.db,
    env: f.env,
    verify: async () => ({ duration: 10, url: "https://owned.test/audio.mp3" }),
    transcribe: async () => {
      try {
        parseTranscript({
          response: { transcript: "PRIVATE_LYRIC", id: "PRIVATE_ID" },
          PRIVATE_FIELD_NAME: "PRIVATE_KEY",
          candidates: [{ text: "PRIVATE_TEXT" }],
        });
      } catch (error) {
        error.stage = "parse_result";
        throw error;
      }
    },
    report: (details) => logs.push(details),
  });
  await assert.rejects(service.generate("u", "musicstream/u/audio/a", true), {
    status: 503,
  });
  assert.equal(logs[0].reason, "UNSUPPORTED_RESPONSE");
  assert.deepEqual(logs[0].responseShape, {
    type: "object",
    unknownFieldCount: 1,
    fields: {
      response: {
        type: "object",
        unknownFieldCount: 0,
        fields: { transcript: "string", id: "string" },
      },
      candidates: { type: "array", count: 1 },
    },
  });
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE/);
});

test("transcription uploads only verified media, reads model output and cleans provider files on failure", async () => {
  const bytes = require("../tools/local/demo-audio.cjs").demoAudio(
    "/local-audio/sample-short.wav",
  );
  for (const variant of [
    "steps",
    "outputs",
    "envelope",
    "http_error",
    "parse_error",
  ]) {
    const calls = [];
    const request = async (url, options) => {
      calls.push([url, options]);
      if (url === "https://owned.test/audio.wav") {
        assert.equal(options.headers, undefined);
        return new Response(bytes);
      }
      if (url.endsWith("/upload/v1beta/files"))
        return new Response(null, {
          headers: {
            "x-goog-upload-url":
              "https://generativelanguage.googleapis.com/upload/session",
          },
        });
      if (url.endsWith("/upload/session")) {
        assert.deepEqual(options.body, bytes);
        return Response.json({
          file: {
            name: "files/test",
            uri: "https://generativelanguage.googleapis.com/v1beta/files/test",
            state: "ACTIVE",
          },
        });
      }
      if (url.endsWith("/interactions")) {
        assert.equal(JSON.parse(options.body).stream, false);
        assert.equal(
          JSON.parse(options.body).generation_config.transcription_config.mode
            .type,
          "verbatim",
        );
        return variant === "http_error"
          ? new Response(null, { status: 403 })
          : variant === "envelope"
            ? Response.json({
                interaction: {
                  status: "completed",
                  outputs: [{ type: "text", text: " Lời nháp " }],
                },
              })
            : variant === "parse_error"
              ? Response.json({ status: "completed", steps: [] })
              : variant === "outputs"
                ? Response.json({
                    outputs: [{ type: "text", text: " Lời nháp " }],
                  })
                : Response.json({
                    status: "completed",
                    steps: [
                      {
                        type: "model_output",
                        content: [{ type: "text", text: " Lời nháp " }],
                      },
                    ],
                  });
      }
      assert.equal(options.method, "DELETE");
      return new Response(null, { status: 200 });
    };
    const input = {
      uid: "u",
      song: { audioPublicId: "musicstream/u/audio/a", durationSeconds: 12 },
      env: {
        GEMINI_API_KEY: "test",
        AI_TRANSCRIBE_MODEL: "gemini-3.5-transcribe",
      },
      verify: async (uid, id) => {
        assert.equal(uid, "u");
        assert.equal(id, "musicstream/u/audio/a");
        return { url: "https://owned.test/audio.wav", duration: 12 };
      },
      request,
    };
    if (variant === "http_error") await assert.rejects(transcribeSong(input));
    else if (variant === "parse_error")
      await assert.rejects(transcribeSong(input), (error) => {
        assert.equal(error.stage, "parse_result");
        assert.equal(error.parseReason, "EMPTY_TRANSCRIPT");
        return true;
      });
    else assert.equal(await transcribeSong(input), "Lời nháp");
    assert.equal(calls.at(-1)[1].method, "DELETE");
  }
});
