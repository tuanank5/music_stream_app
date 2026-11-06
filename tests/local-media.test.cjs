const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  localMediaPath,
  imageUrl,
} = require("../tools/backend/local-media.cjs");
const { audioSourceUri } = require("../src/utils/audioSource.ts");

function imagePreparation(renderAsync) {
  const Module = require("node:module");
  const filename = require.resolve("../src/services/prepareImageUpload.ts");
  const compiled = require("typescript").transpileModule(
    require("node:fs").readFileSync(filename, "utf8"),
    { compilerOptions: { module: require("typescript").ModuleKind.CommonJS } },
  ).outputText;
  const calls = [];
  const context = {
    renderAsync,
    resize: (size) => calls.push(size),
    release: () => calls.push("context released"),
  };
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.require = (request) => {
    assert.equal(request, "expo-image-manipulator");
    return {
      ImageManipulator: {
        manipulate: (uri) => {
          calls.push(uri);
          return context;
        },
      },
      SaveFormat: { PNG: "png" },
    };
  };
  mod._compile(compiled, filename);
  return { prepare: mod.exports.prepareImageUpload, calls };
}

test("image preparation exports decoded pixels as PNG and drops the original file and MIME", async () => {
  let released = 0;
  const { prepare, calls } = imagePreparation(async () => ({
    width: 200,
    height: 100,
    saveAsync: async (options) => {
      assert.deepEqual(options, { format: "png", base64: true });
      return { uri: "converted.png", base64: "YWJj" };
    },
    release: () => released++,
  }));
  const output = await prepare({
    uri: "picked.heic",
    name: "photo.weird",
    mimeType: "application/octet-stream",
    size: 99,
    file: {},
  });
  assert.deepEqual(output, {
    uri: "converted.png",
    name: "photo.png",
    mimeType: "image/png",
    size: 3,
  });
  assert.equal(released, 1);
  assert.deepEqual(calls, ["picked.heic", "context released"]);
});

test("image preparation reports decoder failure and enforces encoded size", async () => {
  const failed = imagePreparation(async () => {
    throw Error("unsupported codec");
  });
  await assert.rejects(
    failed.prepare({ uri: "bad", name: "bad.jpg" }),
    /JPG\/PNG/,
  );
  assert.equal(failed.calls.at(-1), "context released");
  const large = imagePreparation(async () => ({
    width: 1,
    height: 1,
    release() {},
    saveAsync: async () => ({
      uri: "large",
      base64: "A".repeat(7 * 1024 * 1024),
    }),
  }));
  await assert.rejects(
    large.prepare({ uri: "large", name: "large.png" }),
    /vượt 5 MB/,
  );
});
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
