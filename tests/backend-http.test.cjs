const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createServer } = require("node:http");
const { once } = require("node:events");
const {
  createHttpApp,
  finishHttpApp,
} = require("../tools/backend/http-app.cjs");

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
