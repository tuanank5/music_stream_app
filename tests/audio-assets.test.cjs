const { test } = require("node:test");
const assert = require("node:assert/strict");
const { mp4Audio } = require("./helpers/mp4-audio.cjs");
const {
  audioUploadConfig,
  verifyAudio,
} = require("../tools/backend/audio-assets.cjs");
const { validateSongInput } = require("../tools/backend/song-create.cjs");
const {
  imageUploadConfig,
  verifyImage,
  prepareImage,
  signature,
} = require("../tools/backend/image-assets.cjs");

test("M4A audio with generic MP4 branding accepts a 20 MiB three-minute container", async () => {
  const { inspectAudio } = require("../tools/backend/inspect-audio.cjs");
  const bytes = mp4Audio({
    brand: "isom",
    payloadBytes: 20 * 1024 * 1024 - 400,
  });
  const { fileTypeFromBuffer } =
    await import("../tools/node_modules/file-type/source/index.js");
  assert.equal((await fileTypeFromBuffer(bytes)).ext, "mp4");
  assert.equal(
    await inspectAudio(
      "https://owned.test/audio.m4a",
      bytes.length,
      async () => new Response(bytes),
    ),
    180,
  );
});

test("MP4 container support does not permit video tracks or invalid durations", async () => {
  const { inspectAudio } = require("../tools/backend/inspect-audio.cjs");
  for (const options of [
    { brand: "isom", video: true },
    { brand: "M4A ", video: true },
    { duration: 0 },
    { duration: 10801 },
  ]) {
    const bytes = mp4Audio(options);
    await assert.rejects(
      inspectAudio(
        "https://owned.test/audio.m4a",
        bytes.length,
        async () => new Response(bytes),
      ),
      { status: 400 },
    );
  }
  const bytes = mp4Audio({ brand: "M4A " });
  assert.equal(
    await inspectAudio(
      "https://owned.test/audio.m4a",
      bytes.length,
      async () => new Response(bytes),
    ),
    180,
  );
});

test("signed image tickets are persisted, prohibit overwrite, and verify server metadata in the owner's namespace", async () => {
  const keys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const previous = keys.map((key) => process.env[key]);
  try {
    keys.forEach((key, i) => {
      process.env[key] = ["test-cloud", "test-key", "test-secret"][i];
    });
    let ticket;
    const db = {
      collection: (name) => {
        assert.equal(name, "imageAssets");
        return {
          doc: () => ({
            create: async (value) => {
              ticket = value;
            },
          }),
        };
      },
    };
    const config = await imageUploadConfig(db, "alice");
    assert.equal(ticket.publicId, config.publicId);
    assert.equal(ticket.state, "pending");
    assert.deepEqual(ticket.refs, []);
    assert.equal(config.overwrite, "false");
    assert.equal(
      config.signature,
      signature(
        {
          public_id: config.publicId,
          timestamp: config.timestamp,
          overwrite: "false",
          allowed_formats: "png,jpg,webp",
        },
        "test-secret",
      ),
    );
    const url = `https://res.cloudinary.com/test-cloud/image/upload/v1/${config.publicId}.png`;
    const metadata = {
      public_id: config.publicId,
      secure_url: url,
      resource_type: "image",
      type: "upload",
      width: 1600,
      height: 1600,
      format: "png",
      bytes: 2048,
    };
    let calls = 0;
    const request = async (endpoint, options) => {
      calls++;
      assert.ok(endpoint.startsWith("https://api.cloudinary.com/"));
      assert.ok(options.headers.Authorization.startsWith("Basic "));
      return { ok: true, json: async () => metadata };
    };
    assert.deepEqual(await verifyImage("alice", url, request), {
      url,
      publicId: config.publicId,
    });
    await assert.rejects(verifyImage("bob", url, request), { status: 403 });
    await assert.rejects(
      verifyImage(
        "alice",
        url.replace("res.cloudinary.com", "attacker.test"),
        request,
      ),
      { status: 400 },
    );
    assert.equal(calls, 1);
    for (const changes of [
      { bytes: 5242881 },
      { resource_type: "video" },
      { width: 0 },
      { pages: 2 },
      { secure_url: url + "?fake" },
    ]) {
      const bad = async () => ({
        ok: true,
        json: async () => ({ ...metadata, ...changes }),
      });
      await assert.rejects(verifyImage("alice", url, bad), { status: 400 });
    }
    await assert.rejects(
      verifyImage("alice", url, async () => {
        throw Error("offline");
      }),
      { status: 503 },
    );
    assert.deepEqual(
      await prepareImage(
        "alice",
        "https://legacy.test/cover.png",
        "cloud",
        "https://legacy.test/cover.png",
      ),
      { url: "https://legacy.test/cover.png", unchanged: true, cloud: true },
    );
    assert.deepEqual(await verifyImage("alice", "", request), {
      url: "",
      publicId: null,
    });
  } finally {
    keys.forEach((key, i) => {
      if (previous[i] === undefined) delete process.env[key];
      else process.env[key] = previous[i];
    });
  }
});
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
      secure_url: `https://res.cloudinary.com/test-cloud/video/upload/v1/${config.publicId}.mp3`,
    };
    const request = async (url, options) => {
      if (url.startsWith("https://res.cloudinary.com/")) {
        assert.equal(options.headers, undefined);
        assert.equal(options.redirect, "error");
        return new Response(Buffer.alloc(metadata.bytes));
      }
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
    assert.throws(() => validateSongInput({ ...value, audioKey: "demo1" }), {
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

test("audio verification inspects actual bytes when duration is missing or artwork dimensions are present", async () => {
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
    const bytes = require("../tools/local/demo-audio.cjs").demoAudio(
      "/local-audio/sample-short.wav",
    );
    const id = "musicstream/alice/audio/sample";
    const url = `https://res.cloudinary.com/test-cloud/video/upload/v1/${id}.wav`;
    for (const extra of [{}, { duration: 12, width: 640, height: 640 }]) {
      let downloads = 0;
      const metadata = {
        public_id: id,
        resource_type: "video",
        secure_url: url,
        bytes: bytes.length,
        ...extra,
      };
      const request = async (target, options) => {
        if (target.startsWith("https://api.cloudinary.com/")) {
          assert.ok(target.endsWith("?media_metadata=true"));
          assert.ok(options.headers.Authorization.startsWith("Basic "));
          return { ok: true, json: async () => metadata };
        }
        assert.equal(target, url);
        assert.equal(options.headers, undefined);
        assert.equal(options.redirect, "error");
        downloads++;
        return new Response(bytes);
      };
      assert.deepEqual(await verifyAudio("alice", id, request), {
        url,
        duration: 12,
      });
      assert.equal(downloads, 1);
      for (const bad of [
        "https://attacker.test/audio.wav",
        url.replace("test-cloud", "wrong-cloud"),
        url.replace("/alice/", "/bob/"),
      ]) {
        metadata.secure_url = bad;
        await assert.rejects(verifyAudio("alice", id, request), {
          status: 400,
        });
      }
      assert.equal(downloads, 1, "Unexpected URLs must not be fetched");
    }
  } finally {
    keys.forEach((key, i) => {
      if (before[i] === undefined) delete process.env[key];
      else process.env[key] = before[i];
    });
  }
});

test("audio inspection cancels oversized bodies, rejects changed bytes and recovers after transport failures", async () => {
  const { inspectAudio } = require("../tools/backend/inspect-audio.cjs");
  const bytes = require("../tools/local/demo-audio.cjs").demoAudio(
    "/local-audio/sample-short.wav",
  );
  let cancelled = false;
  const body = new ReadableStream({
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    inspectAudio(
      "https://unused.test",
      1,
      async () =>
        new Response(body, {
          headers: { "content-length": String(31 * 1024 * 1024) },
        }),
    ),
    { status: 400 },
  );
  assert.ok(cancelled);
  await assert.rejects(
    inspectAudio(
      "https://unused.test",
      bytes.length + 1,
      async () => new Response(bytes),
    ),
    { status: 503 },
  );
  await assert.rejects(
    inspectAudio("https://unused.test", bytes.length, async () => {
      throw Error("timeout");
    }),
    { status: 503 },
  );
  assert.equal(
    await inspectAudio(
      "https://unused.test",
      bytes.length,
      async () => new Response(bytes),
    ),
    12,
  );
});
