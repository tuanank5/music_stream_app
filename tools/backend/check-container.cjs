const fs = require("node:fs");
const path = require("node:path");
const { createRequire, Module } = require("node:module");
const { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");
async function smoke(root, container = false) {
  const load = createRequire(path.join(root, "entry.cjs"));
  assert.equal(
    typeof load("./tools/backend/service.cjs").createBackend,
    "function",
  );
  const { SearchIndex } = load("./tools/backend/search-index.cjs");
  const index = new SearchIndex();
  try {
    index.put("song", "check", "Dong song", "");
    assert.deepEqual(index.search("dong"), ["song:check"]);
  } finally {
    index.close();
  }
  if (container)
    assert.notEqual(process.getuid(), 0, "Container must run as non-root");
  const { createHttpApp, finishHttpApp } = load("./tools/backend/http-app.cjs");
  const app = createHttpApp({
    db: {},
    auth: {
      verifyIdToken: async () => {
        throw Error("No credentials in smoke test");
      },
    },
    origins: [],
    mode: "cloud",
    projectId: "packaging-smoke",
    isHealthy: () => true,
  });
  finishHttpApp(app);
  const server = require("node:http").createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/health`,
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).ready, true);
    assert.equal(
      (await fetch(`http://127.0.0.1:${server.address().port}/me`)).status,
      401,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log(
    `PASS: ${container ? "container" : "source tree"} module load, SQLite FTS5, health and unauthenticated denial; no cloud requests`,
  );
}
function command(args, root) {
  const result = spawnSync("docker", args, {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error?.code === "ENOENT")
    throw Error(
      "Docker CLI is not installed. Install/start Docker Desktop with Linux containers, then rerun npm run backend:docker:smoke.",
    );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(
      `docker ${args[0]} failed (exit ${result.status}); check that the daemon is running`,
    );
}
async function main() {
  const flag = process.argv[2];
  if (flag === "--inside") return smoke(path.resolve(__dirname, "../.."), true);
  if (flag && flag !== "--source") throw Error("Use [--source]");
  const root = path.resolve(__dirname, "../..");
  if (!flag) {
    command(["info", "--format", "{{.OSType}}"], root);
    command(
      [
        "build",
        "-f",
        "Dockerfile.backend",
        "-t",
        "music-stream-backend:smoke",
        ".",
      ],
      root,
    );
    command(
      [
        "run",
        "--rm",
        "--network",
        "none",
        "--read-only",
        "--cap-drop",
        "ALL",
        "--security-opt",
        "no-new-privileges",
        "music-stream-backend:smoke",
        "node",
        "tools/backend/check-container.cjs",
        "--inside",
      ],
      root,
    );
    return;
  }
  // Source smoke is deliberately separate: this does not build a Docker image.
  const parent = path.join(root, ".local");
  fs.mkdirSync(parent, { recursive: true });
  const stage = fs.mkdtempSync(path.join(parent, "backend-package-"));
  process.env.NODE_PATH = path.join(root, "tools/node_modules");
  Module._initPaths();
  try {
    for (const line of fs
      .readFileSync(path.join(root, "Dockerfile.backend"), "utf8")
      .split(/\r?\n/)) {
      if (!line.startsWith("COPY ")) continue;
      const inputs = line.split(/\s+/).slice(1),
        destination = inputs.pop();
      for (const source of inputs)
        fs.cpSync(
          path.join(root, source),
          inputs.length > 1
            ? path.join(stage, destination, path.basename(source))
            : path.join(stage, destination),
          { recursive: true },
        );
    }
    await smoke(stage);
  } finally {
    const resolved = path.resolve(stage);
    if (
      path.dirname(resolved) !== parent ||
      !path.basename(resolved).startsWith("backend-package-")
    )
      throw Error("Unexpected staging cleanup path");
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
