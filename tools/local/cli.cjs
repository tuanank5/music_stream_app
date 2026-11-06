const { spawn, spawnSync } = require("node:child_process");
const { resolve } = require("node:path");
const { existsSync } = require("node:fs");
const { localEnvironment } = require("./environment.cjs");

const root = resolve(__dirname, "../..");
const env = localEnvironment();
if (process.platform === "win32") {
  // Oracle's javapath launcher can leave the real JVM alive after the CLI kills
  // the launcher. Point PATH at the actual JDK so shutdown owns the real process.
  const java = spawnSync("java", ["-XshowSettings:properties", "-version"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const home = /^\s*java\.home\s*=\s*(.+)\s*$/m
    .exec(java.stderr || "")?.[1]
    .trim();
  if (java.status !== 0 || !home || !existsSync(resolve(home, "bin/java.exe")))
    throw new Error(
      "Cannot resolve JDK java.home. Install Java and verify java -version.",
    );
  const pathKey =
    Object.keys(env).find((key) => key.toLowerCase() === "path") || "Path";
  env[pathKey] = `${resolve(home, "bin")};${env[pathKey] || ""}`;
}
const cli = resolve(
  root,
  "tools/node_modules/firebase-tools/lib/bin/firebase.js",
);
const action = process.argv[2];
if (!["start", "test"].includes(action)) throw new Error("Use start or test.");
if (!existsSync(cli)) throw new Error("Run npm ci --prefix tools first.");
const args = [
  cli,
  action === "start" ? "emulators:start" : "emulators:exec",
  "--only",
  "auth,firestore",
  "--project",
  "demo-music-stream",
  "--config",
  action === "test" && process.env.LOCAL_TEST_CONFIG
    ? resolve(root, process.env.LOCAL_TEST_CONFIG)
    : resolve(root, "firebase.json"),
];
if (action === "start")
  args.push(
    "--import",
    resolve(root, ".local/emulator-data"),
    "--export-on-exit",
    resolve(root, ".local/emulator-data"),
  );
if (action === "test")
  args.push(
    "node --test --test-concurrency=1 tests/local-integration.test.cjs tests/firestore.rules.test.cjs tests/profile-migration.integration.test.cjs tests/target-schema.integration.test.cjs tests/editable-data.integration.test.cjs tests/local-media.integration.test.cjs tests/auth-persistence.integration.test.cjs",
  );
const child = spawn(process.execPath, args, {
  cwd: root,
  env,
  stdio: "inherit",
});
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
