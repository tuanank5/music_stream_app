const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  localMediaPath,
  imageUrl,
} = require("../tools/backend/local-media.cjs");
const { audioSourceUri } = require("../src/utils/audioSource.ts");
test("local media paths remain relative in data, resolve against current LAN backend, and fail closed on cloud/traversal", () => {
  const uri = "/local-media/12345678-1234-1234-1234-123456789abc.wav";
  assert.equal(localMediaPath(uri), "12345678-1234-1234-1234-123456789abc.wav");
  assert.equal(
    audioSourceUri(uri, {
      mode: "emulator",
      backendUrl: "http://192.168.1.5:8787",
    }),
    "http://192.168.1.5:8787" + uri,
  );
  assert.equal(
    audioSourceUri(uri, { mode: "cloud", backendUrl: "https://example.test" }),
    null,
  );
  assert.equal(localMediaPath(uri + ".json"), null);
  assert.equal(localMediaPath("/local-media/../../.env"), null);
  assert.throws(() => imageUrl(uri, "local-listener", "cloud"), {
    status: 400,
  });
});
