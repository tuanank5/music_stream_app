const { test } = require("node:test");
const assert = require("node:assert/strict");
const { once } = require("node:events");
const fs = require("node:fs");
const path = require("node:path");
const { configureLocalAdmin } = require("../tools/local/environment.cjs");
const { createBackend } = require("../tools/backend/service.cjs");
const { demoAudio } = require("../tools/local/demo-audio.cjs");
const { ROOT, localMediaPath } = require("../tools/backend/local-media.cjs");
const {
  assetRef,
  cleanImages,
  GRACE_MS,
  stageImageChange,
} = require("../tools/backend/image-assets.cjs");

test("cloud image routes bind verified assets transactionally and cleanup preserves shared references and retries", async () => {
  const { app, db } = configureLocalAdmin();
  const keys = [
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];
  const env = keys.map((key) => process.env[key]);
  const originalFetch = global.fetch;
  const assets = new Map(),
    tickets = [],
    albums = [];
  const uid = "local-artist-01";
  const userRef = db.doc(`users/${uid}`),
    user = await userRef.get();
  const songs = await db
    .collection("songs")
    .where("artistId", "==", uid)
    .limit(1)
    .get();
  const song = songs.docs[0];
  const createdSongs = [];
  assert.ok(song);
  let server,
    failDestroy = false,
    destroyed = [];
  try {
    keys.forEach((key, i) => {
      process.env[key] = ["test-cloud", "test-key", "test-secret"][i];
    });
    global.fetch = async (url, options) => {
      if (!String(url).startsWith("https://api.cloudinary.com/"))
        return originalFetch(url, options);
      if (String(url).endsWith("/image/destroy")) {
        if (failDestroy) throw Error("simulated timeout");
        destroyed.push(options.body.get("public_id"));
        return { ok: true, json: async () => ({ result: "ok" }) };
      }
      if (String(url).includes("/resources/video/upload/"))
        return {
          ok: true,
          json: async () => ({
            public_id: `musicstream/${uid}/audio/test`,
            resource_type: "video",
            duration: 12,
            bytes: 1000,
            secure_url: "https://example.test/verified.mp3",
          }),
        };
      const id = decodeURIComponent(new URL(url).pathname.split("/upload/")[1]);
      const value = assets.get(id);
      return {
        ok: !!value,
        status: value ? 200 : 404,
        json: async () => value,
      };
    };
    server = await createBackend({
      db,
      auth: { verifyIdToken: async (uid) => ({ uid }) },
      projectId: "demo-music-stream",
      mode: "cloud",
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const base = `http://127.0.0.1:${server.address().port}`;
    const api = async (method, route, data, actor = uid) => {
      const response = await global.fetch(base + route, {
        method,
        headers: {
          Authorization: `Bearer ${actor}`,
          "Content-Type": "application/json",
        },
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      const body = await response.json();
      return { status: response.status, body };
    };
    const issue = async () => {
      const result = await api("GET", "/image-upload-config");
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const config = result.body;
      tickets.push(assetRef(db, config.publicId));
      const url = `https://res.cloudinary.com/test-cloud/image/upload/v1/${config.publicId}.png`;
      assets.set(config.publicId, {
        public_id: config.publicId,
        secure_url: url,
        resource_type: "image",
        type: "upload",
        format: "png",
        width: 100,
        height: 100,
        bytes: 1000,
      });
      return { ...config, url };
    };
    const shared = await issue(),
      replacement = await issue(),
      abandoned = await issue();
    const patchProfile = (url) =>
      api("PATCH", "/me", {
        displayName: user.data().displayName,
        biography: user.data().biography,
        avatarUrl: url,
      });
    assert.equal((await patchProfile(shared.url)).status, 200);
    assert.equal((await userRef.get()).data().avatarPublicId, shared.publicId);
    const fields = {
      title: "Cloud managed album",
      coverUrl: shared.url,
      description: "test",
      isPublic: false,
    };
    const album = await api("POST", "/albums", fields);
    assert.equal(album.status, 201, JSON.stringify(album.body));
    albums.push(db.doc(`albums/${album.body.id}`));
    assert.equal((await albums[0].get()).data().coverPublicId, shared.publicId);
    assert.equal(
      (await api("PATCH", `/songs/${song.id}/cover`, { coverUrl: shared.url }))
        .status,
      200,
    );
    assert.equal((await song.ref.get()).data().coverPublicId, shared.publicId);
    const songInput = {
      requestId: `signed-image-song-${Date.now()}`,
      title: "Managed image song",
      artistNames: ["Test"],
      genre: ["Pop"],
      lyric: "",
      description: "",
      isPublic: false,
      albumId: null,
      coverUrl: shared.url,
      audioPublicId: `musicstream/${uid}/audio/test`,
    };
    const created = await api("POST", "/songs", songInput);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const createdRef = db.doc(`songs/${created.body.id}`);
    createdSongs.push(createdRef);
    assert.equal(
      (await createdRef.get()).data().coverPublicId,
      shared.publicId,
    );
    assert.equal((await api("POST", "/songs", songInput)).status, 200);
    assert.equal(
      (await assetRef(db, shared.publicId).get()).data().refs.length,
      4,
    );
    assert.equal(
      (
        await api(
          "PATCH",
          `/songs/${song.id}/cover`,
          { coverUrl: shared.url },
          "local-member",
        )
      ).status,
      403,
    );
    assert.equal(
      (await patchProfile("https://attacker.test/new.png")).status,
      400,
    );
    assert.equal(
      (
        await api("POST", "/albums", {
          ...fields,
          coverPublicId: shared.publicId,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await api("PATCH", `/songs/${song.id}/cover`, {
          coverUrl: replacement.url,
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await api("PATCH", `/songs/${created.body.id}/cover`, {
          coverUrl: replacement.url,
        })
      ).status,
      200,
    );
    assert.equal(
      (await api("DELETE", `/songs/${created.body.id}`)).status,
      200,
    );
    assert.equal((await patchProfile("")).status, 200);
    assert.equal(
      (await assetRef(db, shared.publicId).get()).data().refs.length,
      1,
    );
    // Shared album still protects the old image, even after the grace interval.
    const future = Date.now() + GRACE_MS + 1000;
    const dry = await cleanImages(db, { now: future });
    assert.ok(dry.some((row) => row.publicId === abandoned.publicId));
    assert.ok(
      !dry.some(
        (row) =>
          row.publicId === shared.publicId ||
          row.publicId === replacement.publicId,
      ),
    );
    assert.equal(destroyed.length, 0);
    assert.equal((await api("DELETE", `/albums/${album.body.id}`)).status, 200);
    assert.equal(
      (await assetRef(db, shared.publicId).get()).data().refs.length,
      0,
    );
    // A timeout after claiming deletion leaves a durable tombstone that blocks rebind.
    failDestroy = true;
    await assert.rejects(cleanImages(db, { apply: true, now: future }));
    const deleting = await db
      .collection("imageAssets")
      .where("state", "==", "deleting")
      .get();
    assert.ok(!deleting.empty);
    const tombstone = deleting.docs[0];
    await assert.rejects(
      db.runTransaction(async (tx) => {
        const change = await stageImageChange(tx, db, uid, "albums/rebind", {
          url: assets.get(tombstone.data().publicId).secure_url,
          publicId: tombstone.data().publicId,
        });
        change.write();
      }),
      { status: 409 },
    );
    failDestroy = false;
    await cleanImages(db, { apply: true, now: future });
    assert.ok(destroyed.includes(shared.publicId));
    assert.ok(destroyed.includes(abandoned.publicId));
    assert.ok(!destroyed.includes(replacement.publicId));
    assert.equal(
      (await assetRef(db, shared.publicId).get()).data().state,
      "deleted",
    );
    assert.equal(
      (await api("PATCH", `/songs/${song.id}/cover`, { coverUrl: shared.url }))
        .status,
      409,
    );
    // Never erase an imported/legacy reference just because its ledger is stale.
    const legacy = await issue();
    await userRef.update({
      avatarPublicId: null,
      avatarUrl: legacy.url,
    });
    const protectedRows = await cleanImages(db, {
      apply: true,
      now: Date.now() + GRACE_MS + 1000,
    });
    assert.ok(!protectedRows.some((row) => row.publicId === legacy.publicId));
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
    global.fetch = originalFetch;
    keys.forEach((key, i) => {
      if (env[i] === undefined) delete process.env[key];
      else process.env[key] = env[i];
    });
    await userRef.set(user.data());
    await song.ref.set(song.data());
    for (const ref of [...albums, ...createdSongs, ...tickets])
      await ref.delete();
    await require("node:module")
      .createRequire(require.resolve("../tools/package.json"))(
        "firebase-admin/app",
      )
      .deleteApp(app);
  }
});
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
      // A misleading extension must not control the stored image type.
      "cover.unknown",
    );
    assert.equal(imageResponse.status, 201, await imageResponse.clone().text());
    const image = await imageResponse.json();
    files.push(image.url);
    assert.ok(image.url.endsWith(".png"));
    const fakeImage = await upload(
      "image",
      Buffer.from("not an image"),
      "fake.png",
    );
    assert.equal(fakeImage.status, 400);
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
