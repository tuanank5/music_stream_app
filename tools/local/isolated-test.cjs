const { createServer } = require("node:net");
const { spawn } = require("node:child_process");
const { mkdirSync, writeFileSync, unlinkSync } = require("node:fs");
const { resolve } = require("node:path");
(async () => {
  const root = resolve(__dirname, "../.."),
    reserved = [];
  for (let i = 0; i < 5; i++) {
    const server = createServer();
    await new Promise((yes, no) => {
      server.once("error", no);
      server.listen(0, "127.0.0.1", yes);
    });
    reserved.push(server);
  }
  const [auth, firestore, hub, logging, websocket] = reserved.map(
    (server) => server.address().port,
  );
  const config = resolve(root, `.firebase-isolated-${process.pid}.json`);
  mkdirSync(resolve(root, ".local"), { recursive: true });
  writeFileSync(
    config,
    JSON.stringify({
      firestore: {
        rules: "firestore.rules",
        indexes: "firestore.indexes.json",
      },
      emulators: {
        auth: { host: "127.0.0.1", port: auth },
        firestore: {
          host: "127.0.0.1",
          port: firestore,
          websocketPort: websocket,
        },
        hub: { host: "127.0.0.1", port: hub },
        logging: { host: "127.0.0.1", port: logging },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    }),
  );
  await Promise.all(
    reserved.map((server) => new Promise((done) => server.close(done))),
  );
  const child = spawn(
    process.execPath,
    [resolve(__dirname, "cli.cjs"), "test"],
    {
      cwd: root,
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        LOCAL_TEST_CONFIG: config,
        FIREBASE_AUTH_EMULATOR_HOST: `127.0.0.1:${auth}`,
        FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestore}`,
        FIREBASE_EMULATOR_HUB: `127.0.0.1:${hub}`,
      },
    },
  );
  child.on("exit", (code) => {
    try {
      unlinkSync(config);
    } catch {}
    process.exitCode = code ?? 1;
  });
  child.on("error", (failure) => {
    try {
      unlinkSync(config);
    } catch {}
    console.error(failure.message);
    process.exitCode = 1;
  });
})().catch((failure) => {
  console.error(failure.message);
  process.exitCode = 1;
});
