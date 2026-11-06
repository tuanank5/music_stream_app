const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { once } = require("node:events");
const {
  createHttpApp,
  finishHttpApp,
} = require("../tools/backend/http-app.cjs");
const { demoAudio } = require("../tools/local/demo-audio.cjs");

test("follow transactions batch-read relation and counters before idempotent writes", async () => {
  const rows = new Map([
    ["users/alice", { active: true, followingCount: 0, followerCount: 0 }],
    ["users/bob", { active: true, followingCount: 0, followerCount: 0 }],
  ]);
  const reads = [];
  const snapshot = (ref) => ({
    ref,
    exists: rows.has(ref.path),
    data: () => ({ ...rows.get(ref.path) }),
  });
  const db = {
    doc: (path) => ({ path, get: async () => snapshot({ path }) }),
    runTransaction: async (work) => {
      let batchReads = 0;
      const writes = [];
      const value = await work({
        get: () => {
          throw Error("Follow must use one batched transactional read");
        },
        getAll: async (...refs) => {
          assert.equal(batchReads++, 0);
          assert.equal(writes.length, 0);
          reads.push(refs.map((ref) => ref.path));
          return refs.map(snapshot);
        },
        create: (ref, data) =>
          writes.push(() => {
            assert.ok(!rows.has(ref.path));
            rows.set(ref.path, data);
          }),
        update: (ref, data) =>
          writes.push(() =>
            rows.set(ref.path, { ...rows.get(ref.path), ...data }),
          ),
        delete: (ref) => writes.push(() => rows.delete(ref.path)),
      });
      writes.forEach((write) => write());
      return value;
    },
  };
  const app = createHttpApp({
    db,
    auth: { verifyIdToken: async () => ({ uid: "alice" }) },
    origins: [],
    mode: "cloud",
    projectId: "test",
    isHealthy: () => true,
  });
  finishHttpApp(app);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const url = `http://127.0.0.1:${server.address().port}/following/bob`;
    for (const [method, count] of [
      ["PUT", 1],
      ["PUT", 1],
      ["DELETE", 0],
      ["DELETE", 0],
    ]) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: "Bearer token" },
      });
      assert.equal(response.status, 200, JSON.stringify(await response.json()));
      assert.equal(rows.get("users/alice").followingCount, count);
      assert.equal(rows.get("users/bob").followerCount, count);
    }
    assert.equal(reads.length, 4);
    for (const paths of reads)
      assert.deepEqual(paths, [
        "users/alice",
        "users/alice/following/bob",
        "users/bob",
      ]);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});

test("local demo WAV supports streaming ranges and HEAD without exposing files or enabling cloud media", async () => {
  for (const mode of ["emulator", "cloud"]) {
    const app = createHttpApp({
      auth: {
        verifyIdToken: async () => {
          throw Error("No token");
        },
      },
      db: {},
      origins: [],
      mode,
      projectId: "demo-music-stream",
      isHealthy: () => true,
    });
    finishHttpApp(app);
    const server = createServer(app);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    try {
      const path = "/local-audio/sample-short.wav";
      const full = await fetch(base + path, {
        headers: { Origin: "http://192.168.1.15:8081" },
      });
      if (mode === "cloud") {
        assert.equal(full.status, 403);
        assert.equal((await fetch(base + path)).status, 401);
        assert.equal(
          (
            await fetch(
              base + "/local-media/12345678-1234-1234-1234-123456789abc.wav",
            )
          ).status,
          401,
        );
        assert.equal(
          (await fetch(base + "/local-media/upload/audio", { method: "POST" }))
            .status,
          405,
        );
        continue;
      }
      assert.equal(full.status, 200);
      assert.match(full.headers.get("content-type"), /audio\/wav/);
      assert.equal(
        full.headers.get("access-control-allow-origin"),
        "http://192.168.1.15:8081",
      );
      const wav = Buffer.from(await full.arrayBuffer());
      assert.deepEqual(wav, demoAudio(path));
      assert.equal(wav.toString("ascii", 0, 4), "RIFF");
      assert.equal(wav.readUInt32LE(40) / wav.readUInt32LE(28), 12);
      const head = await fetch(base + path, { method: "HEAD" });
      assert.equal(head.status, 200);
      assert.equal(Number(head.headers.get("content-length")), wav.length);
      assert.equal((await head.arrayBuffer()).byteLength, 0);
      for (const [range, start, end] of [
        ["bytes=0-43", 0, 43],
        ["bytes=44-", 44, wav.length - 1],
        ["bytes=-20", wav.length - 20, wav.length - 1],
      ]) {
        const part = await fetch(base + path, { headers: { Range: range } });
        assert.equal(part.status, 206);
        assert.equal(
          part.headers.get("content-range"),
          `bytes ${start}-${end}/${wav.length}`,
        );
        assert.deepEqual(
          Buffer.from(await part.arrayBuffer()),
          wav.subarray(start, end + 1),
        );
      }
      for (const range of ["bytes=9999999-", "bytes=0-1,4-5", "invalid"])
        assert.equal(
          (await fetch(base + path, { headers: { Range: range } })).status,
          416,
        );
      assert.equal(
        (await fetch(base + "/local-audio/unknown.wav")).status,
        404,
      );
      assert.equal(
        (await fetch(base + "/local-audio/%2e%2e%2fsecret")).status,
        404,
      );
      assert.equal((await fetch(base + "/local-audio/__proto__")).status, 404);
      assert.equal((await fetch(base + "/songs/local-song-000")).status, 401);
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }
});

test("Express 5 middleware enforces CORS/method/auth/active and catches async errors as JSON", async () => {
  let active = true,
    failure = false;
  const app = createHttpApp({
    auth: {
      verifyIdToken: async (token) => {
        if (token !== "valid") throw Error();
        return { uid: "alice" };
      },
    },
    db: {
      doc: () => ({
        get: async () => {
          if (failure) throw Error("private database error");
          return { exists: true, data: () => ({ active }) };
        },
      }),
    },
    origins: ["https://app.example.test"],
    mode: "cloud",
    projectId: "test",
    isHealthy: () => true,
    onDeactivate: () => {},
  });
  app.get("/test", (req, res) => res.json({ uid: req.auth.uid }));
  finishHttpApp(app);
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: "Bearer valid" };
  try {
    const health = await fetch(`${base}/health`);
    assert.equal(health.status, 200);
    assert.equal(health.headers.get("x-powered-by"), null);
    assert.equal(health.headers.get("cache-control"), "no-store");
    assert.equal((await fetch(`${base}/test`)).status, 401);
    assert.equal(
      (await fetch(`${base}/test`, { method: "POST", headers })).status,
      405,
    );
    assert.equal(
      (
        await fetch(`${base}/test`, {
          headers: { ...headers, Origin: "https://evil.test" },
        })
      ).status,
      403,
    );
    const preflight = await fetch(`${base}/me`, {
      method: "OPTIONS",
      headers: { Origin: "https://app.example.test" },
    });
    assert.equal(preflight.status, 204);
    assert.match(
      preflight.headers.get("access-control-allow-methods"),
      /PATCH/,
    );
    assert.equal((await fetch(`${base}/test`, { headers })).status, 200);
    assert.equal(
      (await fetch(`${base}/me/deactivate`, { headers })).status,
      405,
    );
    assert.equal(
      (
        await fetch(`${base}/me`, {
          method: "PATCH",
          headers: { ...headers, "Content-Type": "application/json" },
          body: "{",
        })
      ).status,
      400,
    );
    active = false;
    assert.equal((await fetch(`${base}/test`, { headers })).status, 403);
    active = true;
    failure = true;
    const error = await fetch(`${base}/test`, { headers });
    assert.equal(error.status, 500);
    assert.deepEqual(await error.json(), {
      error: "Không thể xử lý yêu cầu. Hãy thử lại.",
    });
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
});
