const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { createHash } = require("node:crypto");
const {
  prepare,
  uploadMedia,
  materialize,
  writeDocuments,
} = require("../tools/import-local-cloud.cjs");

test("signed audio import uses owned deterministic IDs and never overwrites Cloudinary assets", async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "music-import-"));
  try {
    const bytes = Buffer.from("test media"),
      ownerId = "local-artist-01";
    const digest = createHash("sha256")
      .update(ownerId)
      .update(bytes)
      .digest("hex")
      .slice(0, 32);
    const stored = `${digest.slice(0, 8)}-${digest.slice(8, 12)}-${digest.slice(12, 16)}-${digest.slice(16, 20)}-${digest.slice(20)}.mp3`;
    const filename = path.join(directory, stored);
    fs.writeFileSync(filename, bytes);
    const item = { filename, stored, ownerId, kind: "audio", duration: 12 };
    const config = {
      cloud: "demo",
      key: "private-key",
      secret: "private-secret",
    };
    const asset = await uploadMedia(item, config, async (url, options) => {
      assert.equal(url, "https://api.cloudinary.com/v1_1/demo/video/upload");
      assert.equal(options.body.get("overwrite"), "false");
      const publicId = `musicstream/${ownerId}/audio/${path.parse(stored).name}`;
      assert.equal(options.body.get("public_id"), publicId);
      const timestamp = options.body.get("timestamp");
      assert.equal(
        options.body.get("signature"),
        createHash("sha1")
          .update(
            `overwrite=false&public_id=${publicId}&timestamp=${timestamp}${config.secret}`,
          )
          .digest("hex"),
      );
      assert.deepEqual(
        Buffer.from(await options.body.get("file").arrayBuffer()),
        bytes,
      );
      return Response.json({
        public_id: publicId,
        secure_url: `https://res.cloudinary.com/demo/video/upload/v1/${publicId}.mp3`,
      });
    });
    assert.equal(asset.duration, 12);
    fs.writeFileSync(filename, "changed");
    await assert.rejects(
      uploadMedia(item, config, () =>
        assert.fail("must not upload changed files"),
      ),
      /changed after planning/,
    );
  } finally {
    assert.ok(
      fs
        .realpathSync(directory)
        .startsWith(fs.realpathSync(os.tmpdir()) + path.sep),
    );
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("local dataset converts to cloud schema with stable IDs and no retained audio buffers", async (t) => {
  const { editableFixture } = require("./helpers/editable-fixture.cjs");
  const plan = await prepare(editableFixture(t));
  const assets = {};
  for (const item of plan.media) {
    assert.equal(item.bytes, undefined);
    assert.ok(item.byteLength > 0);
    const publicId = `musicstream/${item.ownerId}/${item.kind === "audio" ? "audio" : "images"}/${path.parse(item.stored).name}`;
    assets[item.url] = {
      publicId,
      url: `https://res.cloudinary.com/demo/${item.kind === "audio" ? "video" : "image"}/upload/v1/${publicId}.mp3`,
      duration: item.duration,
    };
  }
  const documents = materialize(plan, assets, "demo");
  assert.deepEqual(
    documents.map((row) => row.path),
    plan.documents.map((row) => row.path),
  );
  const songs = documents.filter((row) => row.path.startsWith("songs/"));
  assert.ok(songs.length > 0);
  assert.ok(
    songs.every((row) =>
      row.data.audioUrl.startsWith(
        "https://res.cloudinary.com/demo/video/upload/",
      ),
    ),
  );
  assert.ok(
    plan.documents
      .filter((row) => row.path.startsWith("songs/"))
      .every((row) => row.data.audioUrl.startsWith("/local-media/")),
  );
});

test("Firestore import creates only missing documents, resumes identical data and refuses collisions before writes", async () => {
  const existing = new Map([["users/local-a", { active: true }]]);
  let writes = [];
  const db = {
    doc: (documentPath) => ({ path: documentPath }),
    runTransaction: async (work) =>
      work({
        getAll: async (...refs) =>
          refs.map((ref) => ({
            exists: existing.has(ref.path),
            data: () => existing.get(ref.path),
          })),
        create: (ref, data) => writes.push([ref.path, data]),
      }),
  };
  assert.equal(
    await writeDocuments(db, [
      { path: "users/local-a", data: { active: true } },
      { path: "songs/local-b", data: { title: "B" } },
    ]),
    1,
  );
  assert.deepEqual(writes, [["songs/local-b", { title: "B" }]]);
  writes = [];
  await assert.rejects(
    writeDocuments(db, [
      { path: "songs/local-new", data: {} },
      { path: "users/local-a", data: { active: false } },
    ]),
    /Existing document differs/,
  );
  assert.deepEqual(writes, []);
});

test("cloud materialization refuses unresolved local audio without changing source data", () => {
  const data = { audioUrl: "/audio/Piano/p01.mp3" };
  assert.throws(
    () =>
      materialize(
        { media: [], documents: [{ path: "songs/local-a", data }] },
        {},
        "demo",
      ),
    /Unresolved local media/,
  );
  assert.equal(data.audioUrl, "/audio/Piano/p01.mp3");
});
