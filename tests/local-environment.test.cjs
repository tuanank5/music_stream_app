require("./helpers/register-local.cjs");
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  resolveFirebaseRuntime,
  isLocalHost,
} = require("../src/services/firebase/runtime.ts");
const { localEnvironment } = require("../tools/local/environment.cjs");
const { buildFixtures } = require("../tools/local/fixtures.cjs");
const local = {
  EXPO_PUBLIC_FIREBASE_MODE: "emulator",
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: "demo-music-stream",
  EXPO_PUBLIC_EMULATOR_HOST: "127.0.0.1",
  EXPO_PUBLIC_AUTH_EMULATOR_PORT: "9099",
  EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT: "8080",
  EXPO_PUBLIC_BACKEND_URL: "http://127.0.0.1:8787",
};

test("client fails closed for absent/mixed mode, missing hosts/ports, or a real project in local mode", () => {
  for (const env of [
    {},
    { ...local, EXPO_PUBLIC_FIREBASE_MODE: undefined },
    { ...local, EXPO_PUBLIC_FIREBASE_MODE: "other" },
    { ...local, EXPO_PUBLIC_FIREBASE_PROJECT_ID: "production" },
    { ...local, EXPO_PUBLIC_EMULATOR_HOST: "firebase.google.com" },
    { ...local, EXPO_PUBLIC_AUTH_EMULATOR_PORT: "" },
    { ...local, EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT: "65536" },
    { ...local, EXPO_PUBLIC_BACKEND_URL: "https://remote.example" },
    { ...local, EXPO_PUBLIC_BACKEND_URL: "http://127.0.0.1:8787@evil.example" },
    { ...local, EXPO_PUBLIC_BACKEND_URL: "http://127.0.0.1:8787/cloud" },
    { ...local, EXPO_PUBLIC_FIREBASE_MODE: "cloud" },
  ])
    assert.throws(() => resolveFirebaseRuntime(env));
});

test("local uses synthetic credentials, allows explicit LAN/Android addresses and never copies cloud keys", () => {
  const runtime = resolveFirebaseRuntime({
    ...local,
    EXPO_PUBLIC_FIREBASE_API_KEY: "real-key",
  });
  assert.equal(runtime.config.apiKey, "demo-local-api-key");
  for (const host of [
    "localhost",
    "127.0.0.1",
    "10.0.2.2",
    "192.168.1.10",
    "172.16.1.2",
  ]) {
    assert.ok(isLocalHost(host));
    assert.equal(
      resolveFirebaseRuntime({
        ...local,
        EXPO_PUBLIC_EMULATOR_HOST: host,
        EXPO_PUBLIC_BACKEND_URL: `http://${host}:8787`,
      }).emulator.host,
      host,
    );
  }
  for (const host of [
    "0.0.0.0",
    "8.8.8.8",
    "127.999.1.1",
    "example.com",
    "localhost.evil.com",
    "http://127.0.0.1",
  ])
    assert.equal(isLocalHost(host), false);
});

test("cloud needs explicit mode and complete config, without emulator endpoints", () => {
  const env = {
    EXPO_PUBLIC_FIREBASE_MODE: "cloud",
    EXPO_PUBLIC_FIREBASE_API_KEY: "test-key",
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: "test-cloud-project",
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-cloud-project.appspot.com",
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
    EXPO_PUBLIC_FIREBASE_APP_ID: "1:123:web:test",
  };
  assert.equal(resolveFirebaseRuntime(env).mode, "cloud");
  assert.throws(() =>
    resolveFirebaseRuntime({ ...env, EXPO_PUBLIC_FIREBASE_APP_ID: "" }),
  );
  assert.throws(() =>
    resolveFirebaseRuntime({ ...env, EXPO_PUBLIC_EMULATOR_HOST: "127.0.0.1" }),
  );
});

test("Admin tooling refuses production project and remote/malformed emulator addresses", () => {
  for (const env of [
    { GCLOUD_PROJECT: "production" },
    { GOOGLE_CLOUD_PROJECT: "production" },
    { LOCAL_FIREBASE_PROJECT_ID: "production" },
    { FIRESTORE_EMULATOR_HOST: "firestore.googleapis.com:443" },
    { FIREBASE_AUTH_EMULATOR_HOST: "https://127.0.0.1:9099" },
    { FIRESTORE_EMULATOR_HOST: "127.0.0.1:0" },
  ])
    assert.throws(() => localEnvironment(env));
  assert.equal(localEnvironment({}).GCLOUD_PROJECT, "demo-music-stream");
});

test("actual upload service rejects local uploads before any fetch", async () => {
  const previous = { ...process.env };
  Object.assign(process.env, local);
  const fetch = global.fetch;
  let requests = 0;
  global.fetch = async () => {
    requests++;
    throw new Error("Unexpected network request");
  };
  try {
    const { uploadMedia } = require("../src/services/mediaUploadService.ts");
    await assert.rejects(
      uploadMedia(
        {
          uri: "https://example.com/file",
          name: "cover.png",
          mimeType: "image/png",
        },
        "image",
      ),
      /Cloudinary đã tắt/,
    );
    assert.equal(requests, 0);
  } finally {
    global.fetch = fetch;
    for (const key of Object.keys(local)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("fixtures use bundled audio/no remote media, valid album ownership, and repeated history across pages", () => {
  const { users, documents } = buildFixtures();
  const index = new Map(documents.map((d) => [d.path, d.data]));
  assert.equal(index.size, documents.length);
  assert.equal(users.length, 26);
  const sessions = documents.filter((d) => d.path.includes("/history/"));
  assert.equal(sessions.length, 160);
  assert.equal(new Set(sessions.map((d) => d.data.songId)).size, 80);
  assert.ok(
    documents.filter(
      (d) => d.path.startsWith("songs/") && d.data.genre.includes("Pop"),
    ).length > 50,
  );
  for (const { path, data } of documents) {
    for (const key of ["coverUrl", "avatarUrl", "audioUrl"])
      if (key in data) assert.equal(data[key], "");
    if (path.startsWith("songs/") && data.albumId)
      assert.equal(index.get(`albums/${data.albumId}`).artistId, data.artistId);
  }
});
