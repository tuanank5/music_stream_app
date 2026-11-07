const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequestCache } = require("../src/utils/createRequest.ts");
const { createRequestId } = require("../tools/backend/create-request.cjs");
const { runTransaction } = require("../tools/backend/transaction.cjs");

test("closed transaction retry starts fresh and rechecks quota instead of reusing stale results", async () => {
  let calls = 0,
    used = 10700;
  const reads = [];
  const db = {
    runTransaction: async (work) => {
      const attempt = ++calls;
      const value = await work({
        get: async () => {
          reads.push(attempt);
          return used;
        },
      });
      if (attempt === 1) {
        used = 10800; // Another writer wins while our first transaction aborts.
        throw Object.assign(
          Error("3 INVALID_ARGUMENT: Transaction is invalid or closed."),
          { code: 3 },
        );
      }
      return value;
    },
  };
  await assert.rejects(
    runTransaction(db, async (tx) => {
      if ((await tx.get()) + 100 > 10800)
        throw Object.assign(Error("quota exceeded"), { status: 409 });
      return "candidate";
    }),
    { status: 409 },
  );
  assert.equal(calls, 2);
  assert.deepEqual(reads, [1, 2]);
});

test("transaction retries are bounded and do not retry business, permission or other argument errors", async () => {
  for (const error of [
    Object.assign(Error("bad argument"), { code: 3 }),
    Object.assign(Error("permission denied"), { code: 7 }),
    Object.assign(Error("quota exceeded"), { status: 409 }),
  ]) {
    let calls = 0;
    await assert.rejects(
      runTransaction(
        {
          runTransaction: async () => {
            calls++;
            throw error;
          },
        },
        () => {},
      ),
      (actual) => actual === error,
    );
    assert.equal(calls, 1);
  }
  let calls = 0;
  const error = Object.assign(Error("Transaction is invalid or closed."), {
    code: 3,
  });
  await assert.rejects(
    runTransaction(
      {
        runTransaction: async () => {
          calls++;
          throw error;
        },
      },
      () => {},
    ),
    (actual) => actual === error,
  );
  assert.equal(calls, 3);
});

test("cloud song saving allows audio inspection time without extending other request timeouts", async () => {
  const Module = require("node:module");
  const filename = require.resolve("../src/services/backendService.ts");
  const mod = new Module(filename, module);
  mod.filename = filename;
  const user = { uid: "alice", getIdToken: async () => "token" };
  const runtime = { mode: "cloud", backendUrl: "https://backend.example.test" };
  mod.require = (request) => {
    if (request === "./firebase")
      return { getFirebaseAuth: () => ({ currentUser: user }) };
    if (request === "./firebase/config")
      return { getFirebaseRuntime: () => runtime };
    if (request === "./backendEvents") return { notifyBackendWrite() {} };
    throw Error(request);
  };
  mod._compile(
    require("typescript").transpileModule(
      require("node:fs").readFileSync(filename, "utf8"),
      {
        compilerOptions: { module: require("typescript").ModuleKind.CommonJS },
      },
    ).outputText,
    filename,
  );
  const originalFetch = global.fetch,
    originalTimeout = global.setTimeout;
  const timeouts = [];
  try {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ id: "saved" }),
    });
    global.setTimeout = (callback, ms, ...args) => {
      if (ms === 15000 || ms === 60000) timeouts.push(ms);
      return originalTimeout(callback, ms, ...args);
    };
    await mod.exports.backendPost("/songs", {});
    await mod.exports.backendPost("/albums", {});
    runtime.mode = "emulator";
    await mod.exports.backendPost("/songs", {});
    assert.deepEqual(timeouts, [60000, 15000, 15000]);
  } finally {
    global.fetch = originalFetch;
    global.setTimeout = originalTimeout;
  }
});

test("cloud reads survive Render startup, deduplicate subscribers and classify cancellation without hiding HTTP/session errors", async () => {
  const Module = require("node:module");
  const filename = require.resolve("../src/services/backendService.ts");
  const mod = new Module(filename, module);
  mod.filename = filename;
  const user = { uid: "alice", getIdToken: async () => "token" };
  const auth = { currentUser: user };
  const runtime = {
    mode: "cloud",
    backendUrl: "https://backend.example.test",
    config: { projectId: "test" },
  };
  mod.require = (request) => {
    if (request === "./firebase") return { getFirebaseAuth: () => auth };
    if (request === "./firebase/config")
      return { getFirebaseRuntime: () => runtime };
    if (request === "./backendEvents") return { notifyBackendWrite() {} };
    throw Error(request);
  };
  mod._compile(
    require("typescript").transpileModule(
      require("node:fs").readFileSync(filename, "utf8"),
      {
        compilerOptions: { module: require("typescript").ModuleKind.CommonJS },
      },
    ).outputText,
    filename,
  );
  const original = {
    fetch: global.fetch,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
  };
  const timers = new Map();
  let calls = 0,
    resolveFetch;
  try {
    global.setTimeout = (callback, ms) => {
      const timer = { callback, ms };
      timers.set(timer, timer);
      return timer;
    };
    global.clearTimeout = (timer) => timers.delete(timer);
    global.fetch = async () => {
      calls++;
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    };
    const a = mod.exports.backendGet("/catalog/public-songs"),
      b = mod.exports.backendGet("/catalog/public-songs");
    await Promise.resolve();
    assert.equal(calls, 1);
    assert.deepEqual(
      [...timers.values()].map((t) => t.ms),
      [90000],
    );
    resolveFetch({ ok: true, json: async () => ({ items: [] }) });
    assert.deepEqual(await a, { items: [] });
    assert.deepEqual(await b, { items: [] });
    assert.equal(timers.size, 0);

    global.fetch = async (url, options) =>
      new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () =>
          reject(Error("fetch failed: Fetch request has been canceled")),
        );
      });
    const cancelled = mod.exports.backendGet("/catalog/public-songs");
    const rejection = assert.rejects(cancelled, {
      code: "BACKEND_TIMEOUT",
      message: "Máy chủ phản hồi chậm. Vui lòng thử tải lại sau.",
    });
    await Promise.resolve();
    [...timers.values()][0].callback();
    await rejection;
    assert.equal(timers.size, 0);

    global.fetch = async () => {
      throw new TypeError("Network request failed");
    };
    await assert.rejects(mod.exports.backendGet("/catalog/public-songs"), {
      code: "BACKEND_NETWORK_ERROR",
    });
    global.fetch = async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: "Permission denied" }),
    });
    await assert.rejects(mod.exports.backendGet("/catalog/public-songs"), {
      status: 403,
      message: "Permission denied",
    });
    global.fetch = async () => {
      auth.currentUser = null;
      return { ok: true, json: async () => ({ items: [] }) };
    };
    await assert.rejects(mod.exports.backendGet("/catalog/public-songs"), {
      message: "Phiên đăng nhập đã thay đổi.",
    });
    auth.currentUser = user;
    runtime.mode = "emulator";
    global.fetch = async () => {
      assert.equal([...timers.values()][0].ms, 15000);
      return { ok: true, json: async () => ({ items: [] }) };
    };
    await mod.exports.backendGet("/catalog/public-songs");
    assert.equal(timers.size, 0);
  } finally {
    Object.assign(global, original);
  }
});

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
