const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { configureLocalAdmin } = require("../tools/local/environment.cjs");
const { createBackend } = require("../tools/backend/service.cjs");
const { demoAudio } = require("../tools/local/demo-audio.cjs");
const { ROOT, localMediaPath } = require("../tools/backend/local-media.cjs");
test("local audio/image upload persists bytes and song/album metadata across backend restart", async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST);
  const { app, db } = configureLocalAdmin();
  let server, base;
  const files = [],
    refs = [];
  const start = async () => {
    server = await createBackend({
      db,
      auth: { verifyIdToken: async (uid) => ({ uid }) },
      projectId: "demo-music-stream",
      mode: "emulator",
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      server = null;
    }
  };
  const request = (method, route, data, uid = "local-listener") =>
    fetch(base + route, {
      method,
      headers: {
        Authorization: `Bearer ${uid}`,
        "Content-Type": "application/json",
      },
      ...(data ? { body: JSON.stringify(data) } : {}),
    });
  const upload = async (kind, bytes, name, uid = "local-listener") => {
    const form = new FormData();
    form.append("file", new Blob([bytes]), name);
    return fetch(`${base}/local-media/upload/${kind}`, {
      method: "POST",
      headers: uid ? { Authorization: `Bearer ${uid}` } : {},
      body: form,
    });
  };
  try {
    await start();
    const wav = demoAudio("/local-audio/sample-short.wav");
    assert.equal((await upload("audio", wav, "sound.wav", "")).status, 401);
    assert.equal(
      (await upload("audio", Buffer.from("not audio"), "sound.mp3")).status,
      400,
    );
    const audioResponse = await upload("audio", wav, "../../sound.wav");
    assert.equal(audioResponse.status, 201, await audioResponse.clone().text());
    const audio = await audioResponse.json();
    files.push(audio.url);
    assert.equal(audio.duration, 12);
    const imageResponse = await upload(
      "image",
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jF1kAAAAASUVORK5CYII=",
        "base64",
      ),
      "cover.png",
    );
    assert.equal(imageResponse.status, 201, await imageResponse.clone().text());
    const image = await imageResponse.json();
    files.push(image.url);
    assert.equal(
      (await upload("image", Buffer.alloc(5 * 1024 * 1024 + 1), "big.png"))
        .status,
      400,
    );
    const fields = {
      title: "Local stored album",
      coverUrl: image.url,
      description: "Stored locally",
      isPublic: false,
    };
    assert.equal(
      (await request("POST", "/albums", fields, "local-member")).status,
      403,
    );
    const albumResponse = await request("POST", "/albums", fields);
    assert.equal(albumResponse.status, 201);
    const album = await albumResponse.json();
    refs.push(db.doc(`albums/${album.id}`));
    const song = {
      requestId: `local-upload-${Date.now()}-song`,
      title: "Local stored song",
      artistNames: ["Local performer"],
      albumId: album.id,
      coverUrl: image.url,
      audioPublicId: audio.publicId,
      lyric: "",
      description: "",
      genre: ["Pop"],
      isPublic: false,
    };
    assert.equal(
      (
        await request(
          "POST",
          "/songs",
          { ...song, albumId: "", coverUrl: "" },
          "local-member",
        )
      ).status,
      403,
    );
    const created = await request("POST", "/songs", song);
    assert.equal(created.status, 201, await created.clone().text());
    refs.push(db.doc(`songs/${song.requestId}`));
    assert.equal((await request("POST", "/songs", song)).status, 200);
    const stored = (await refs.at(-1).get()).data();
    assert.equal(stored.durationSeconds, 12);
    assert.equal(stored.audioUrl, audio.url);
    assert.equal(stored.albumId, album.id);
    assert.equal(
      (await request("GET", `/songs/${song.requestId}`, null, "local-member"))
        .status,
      403,
    );
    const range = await fetch(base + audio.url, {
      headers: { Range: "bytes=0-43" },
    });
    assert.equal(range.status, 206);
    assert.deepEqual(
      Buffer.from(await range.arrayBuffer()),
      wav.subarray(0, 44),
    );
    assert.equal(
      (await fetch(base + audio.url, { method: "HEAD" })).status,
      200,
    );
    assert.equal((await fetch(base + audio.url + ".json")).status, 404);
    await stop();
    await start();
    assert.deepEqual(
      Buffer.from(await (await fetch(base + audio.url)).arrayBuffer()),
      wav,
    );
    assert.equal(
      (await (await request("GET", `/songs/${song.requestId}`)).json()).cover,
      image.url,
    );
    assert.equal(
      (await db.doc(`albums/${album.id}`).get()).data().coverUrl,
      image.url,
    );
  } finally {
    await stop();
    await Promise.all(refs.map((ref) => ref.delete()));
    for (const url of files)
      for (const suffix of ["", ".json"]) {
        const file = path.join(ROOT, localMediaPath(url) + suffix);
        if (fs.existsSync(file)) fs.unlinkSync(file);
      }
    await require("node:module")
      .createRequire(require.resolve("../tools/package.json"))(
        "firebase-admin/app",
      )
      .deleteApp(app);
  }
});
