const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { configureLocalAdmin } = require("../tools/local/environment.cjs");
const { loadEditableData } = require("../tools/local/editable-data.cjs");
test("editable dataset imports through local-only CLI, synchronizes Auth names and backs up documents", async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  const { app, db, auth } = configureLocalAdmin();
  try {
    const result = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["tools/local/editable-data.cjs", "apply"],
        {
          cwd: require("node:path").resolve(__dirname, ".."),
          env: process.env,
          windowsHide: true,
        },
      );
      let output = "",
        error = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        error += chunk;
      });
      child.on("error", reject);
      child.on("exit", (code) =>
        code === 0
          ? resolve(JSON.parse(output))
          : reject(new Error(error || output)),
      );
    });
    const { documents } = await loadEditableData();
    assert.equal(result.projectId, "demo-music-stream");
    assert.equal(result.written, documents.length);
    assert.equal(result.deleted, 0);
    assert.ok(require("node:fs").existsSync(result.backupFile));
    for (const row of documents
      .filter((row) => /^users\/[^/]+$|^songs\/[^/]+$/.test(row.path))
      .slice(0, 30))
      assert.deepEqual((await db.doc(row.path).get()).data(), row.data);
    assert.equal(
      (await auth.getUser("local-artist-01")).displayName,
      documents.find((row) => row.path === "users/local-artist-01").data
        .displayName,
    );
  } finally {
    await require("node:module")
      .createRequire(require.resolve("../tools/package.json"))(
        "firebase-admin/app",
      )
      .deleteApp(app);
  }
});
