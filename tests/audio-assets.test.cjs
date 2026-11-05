const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  audioUploadConfig,
  verifyAudio,
} = require("../tools/backend/audio-assets.cjs");
const { validateSongInput } = require("../tools/backend/song-create.cjs");
test("signed audio uses own namespace and server metadata; validates size/video and payload whitelist", async () => {
  const keys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const before = keys.map((key) => process.env[key]);
  try {
    keys.forEach((key, i) => {
      process.env[key] = ["test-cloud", "test-key", "test-secret"][i];
    });
    const config = audioUploadConfig("alice");
    assert.ok(config.publicId.startsWith("musicstream/alice/audio/"));
    assert.equal(config.signature.length, 40);
    assert.ok(!JSON.stringify(config).includes("test-secret"));
    const metadata = {
      public_id: config.publicId,
      resource_type: "video",
      duration: 85,
      bytes: 1000,
      secure_url: "https://example.test/audio.mp3",
    };
    const request = async (url, options) => {
      assert.ok(url.startsWith("https://api.cloudinary.com/"));
      assert.ok(options.headers.Authorization.startsWith("Basic "));
      return { ok: true, json: async () => metadata };
    };
    assert.deepEqual(await verifyAudio("alice", config.publicId, request), {
      url: metadata.secure_url,
      duration: 85,
    });
    await assert.rejects(verifyAudio("bob", config.publicId, request), {
      status: 403,
    });
    metadata.width = 100;
    await assert.rejects(verifyAudio("alice", config.publicId, request), {
      status: 400,
    });
    metadata.width = 0;
    metadata.bytes = 31 * 1024 * 1024;
    await assert.rejects(verifyAudio("alice", config.publicId, request), {
      status: 400,
    });
    const value = {
      requestId: "a".repeat(20),
      title: "Demo",
      artistNames: ["A", "B"],
      genre: ["Pop"],
      lyric: "",
      description: "",
      isPublic: true,
      albumId: "",
      coverUrl: "",
      audioPublicId: config.publicId,
    };
    assert.equal(validateSongInput(value).artistNames.length, 2);
    assert.throws(() => validateSongInput({ ...value, durationSeconds: 1 }), {
      status: 400,
    });
    assert.throws(() => validateSongInput({ ...value, genre: ["Unknown"] }), {
      status: 400,
    });
  } finally {
    keys.forEach((key, i) => {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    });
  }
});
