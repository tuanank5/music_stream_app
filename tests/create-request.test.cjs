const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequestCache } = require("../src/utils/createRequest.ts");
const { createRequestId } = require("../tools/backend/create-request.cjs");

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
