const express = require("express");
const path = require("node:path");
const { createAlbumRouter } = require("./album-routes.cjs");
const { createFavoriteAlbumsRouter } = require("./favorite-albums.cjs");
const { createPlaylistRouter } = require("./playlist-routes.cjs");
const { createSongOwnerRouter } = require("./song-owner-routes.cjs");
const { createSongUploadRouter } = require("./song-upload-routes.cjs");
const { createSocialRouter } = require("./social-routes.cjs");
const { createFeedRouter } = require("./feed-routes.cjs");
const { createAccessRouter } = require("./access-routes.cjs");
const { createHistoryReadRouter } = require("./history-read.cjs");
const { createPlaybackRouter } = require("./playback-routes.cjs");
const { createSongReadRouter } = require("./song-read.cjs");
const { createCatalogReadRouter } = require("./catalog-read.cjs");
const { createLyricRouter } = require("./ai/lyric-routes.cjs");
const {
  mountLocalMediaFiles,
  createLocalMediaRouter,
} = require("./local-media.cjs");
const { FieldValue } = require("firebase-admin/firestore");
const { isLocalHost } = require("../../src/services/firebase/runtime.ts");
const {
  readProfileBody,
  ownProfile,
  deactivateAccount,
} = require("./profile-api.cjs");

function createHttpApp({
  auth,
  db,
  origins,
  mode,
  projectId,
  isHealthy,
  onDeactivate,
}) {
  const app = express();
  const localUploads = mode === "emulator" && projectId === "demo-music-stream";
  app.disable("x-powered-by");
  app.set("case sensitive routing", true);
  app.set("strict routing", true);
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    const origin = req.headers.origin;
    if (origin) {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        return res.status(403).json({ error: "Origin không được phép." });
      }
      if (
        !origins.includes(origin) &&
        !(
          mode === "emulator" &&
          ["http:", "https:"].includes(parsed.protocol) &&
          isLocalHost(parsed.hostname)
        )
      )
        return res.status(403).json({ error: "Origin không được phép." });
      res.set("Access-Control-Allow-Origin", origin);
      res.vary("Origin");
      res.set(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type, Idempotency-Key",
      );
      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      );
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (
      req.method !== "GET" &&
      !(
        localUploads &&
        req.method === "POST" &&
        /^\/local-media\/upload\/(audio|image)$/.test(req.path)
      ) &&
      !(
        localUploads &&
        req.method === "HEAD" &&
        req.path.startsWith("/local-media/")
      ) &&
      !(
        mode === "emulator" &&
        projectId === "demo-music-stream" &&
        req.method === "HEAD" &&
        (req.path.startsWith("/local-audio/") || req.path.startsWith("/audio/"))
      ) &&
      !(req.method === "POST" && req.path === "/songs") &&
      !(req.method === "POST" && req.path === "/me/ensure") &&
      !(req.method === "POST" && /^\/playback\/[^/]+$/.test(req.path)) &&
      !(
        req.method === "POST" &&
        /^\/posts(?:\/[^/]+\/comments)?$/.test(req.path)
      ) &&
      !(
        ["PATCH", "DELETE"].includes(req.method) &&
        /^\/posts\/[^/]+(?:\/comments\/[^/]+)?$/.test(req.path)
      ) &&
      !(
        ["PUT", "DELETE"].includes(req.method) &&
        /^\/(favorites|following)\/[^/]+$/.test(req.path)
      ) &&
      !(req.method === "DELETE" && /^\/songs\/[^/]+$/.test(req.path)) &&
      !(req.method === "PATCH" && /^\/songs\/[^/]+\/cover$/.test(req.path)) &&
      !(req.method === "POST" && req.path === "/audio-lyric-job") &&
      !(req.method === "POST" && req.path === "/playlists") &&
      !(
        ["PATCH", "DELETE"].includes(req.method) &&
        /^\/playlists\/[^/]+$/.test(req.path)
      ) &&
      !(
        ["PUT", "DELETE"].includes(req.method) &&
        /^\/playlists\/[^/]+\/songs\/[^/]+$/.test(req.path)
      ) &&
      !(
        req.method === "PATCH" &&
        (["/me", "/me/deactivate"].includes(req.path) ||
          /^\/albums\/[^/]+$/.test(req.path))
      ) &&
      !(req.method === "POST" && req.path === "/albums") &&
      !(req.method === "DELETE" && /^\/albums\/[^/]+$/.test(req.path)) &&
      !(
        ["PUT", "DELETE"].includes(req.method) &&
        /^\/favorite-albums\/[^/]+$/.test(req.path)
      ) &&
      !(
        ["PUT", "DELETE"].includes(req.method) &&
        /^\/albums\/[^/]+\/songs\/[^/]+$/.test(req.path)
      )
    )
      return res.status(405).json({ error: "Method not allowed" });
    next();
  });
  app.get("/health", (req, res) =>
    res
      .status(isHealthy() ? 200 : 503)
      .json({ mode, projectId, milestone: "M6", ready: isHealthy() }),
  );
  // These are synthetic public test sounds, never user uploads or private media.
  // Register only in demo mode and keep all business endpoints authenticated.
  if (mode === "emulator" && projectId === "demo-music-stream") {
    const { serveDemoAudio } = require("../local/demo-audio.cjs");

    app.get("/local-audio/:file", serveDemoAudio);

    app.use(
      "/audio",
      express.static(path.resolve(process.cwd(), "assets/audio"), {
        fallthrough: false,
        setHeaders(res) {
          res.setHeader("Cache-Control", "no-store");
        },
      }),
    );
  }
  const rate = new Map();
  if (localUploads) mountLocalMediaFiles(app);
  app.use(async (req, res, next) => {
    const bearer = /^Bearer (.+)$/.exec(req.headers.authorization || "");
    if (!bearer)
      return res.status(401).json({ error: "Authentication required" });
    try {
      req.auth = await auth.verifyIdToken(bearer[1], mode !== "emulator");
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
    if (!isHealthy())
      return res
        .status(503)
        .json({ error: "Index chưa sẵn sàng. Hãy thử lại." });
    const now = Date.now(),
      bucket = rate.get(req.auth.uid);
    if (bucket && now - bucket.time < 60000 && bucket.count >= 120)
      return res.status(429).json({ error: "Quá nhiều yêu cầu." });
    rate.set(
      req.auth.uid,
      bucket && now - bucket.time < 60000
        ? { ...bucket, count: bucket.count + 1 }
        : { time: now, count: 1 },
    );
    if (rate.size > 10000)
      for (const [uid, value] of rate)
        if (now - value.time > 60000) rate.delete(uid);
    if (req.path !== "/me/deactivate") {
      const account = await db.doc(`users/${req.auth.uid}`).get();
      if (account.exists && account.data().active === false)
        return res
          .status(403)
          .json({ error: "Tài khoản của bạn đã bị vô hiệu hóa." });
    }
    next();
  });
  const profile = express.Router({ caseSensitive: true, strict: true });
  profile.post("/me/ensure", async (req, res) => {
    req.resume();
    const user = await auth.getUser(req.auth.uid);
    if (user.disabled)
      return res
        .status(403)
        .json({ error: "Tài khoản của bạn đã bị vô hiệu hóa." });
    const ref = db.doc(`users/${user.uid}`);
    await db.runTransaction(async (tx) => {
      const previous = await tx.get(ref);
      if (previous.exists) {
        if (previous.data().active === false)
          throw Object.assign(
            new Error("Tài khoản của bạn đã bị vô hiệu hóa."),
            { status: 403 },
          );
        return;
      }
      tx.create(ref, {
        email: user.email || "",
        displayName: (user.displayName || "Music lover").slice(0, 80),
        avatarUrl: user.photoURL || "",
        avatarPublicId: null,
        biography: "",
        followerCount: 0,
        followingCount: 0,
        active: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    res.json(await ownProfile(db, user.uid));
  });
  profile.get("/me", async (req, res) =>
    res.json(await ownProfile(db, req.auth.uid)),
  );
  profile.patch("/me", async (req, res) =>
    res.json(
      await ownProfile(
        db,
        req.auth.uid,
        await readProfileBody(req, { mode, uid: req.auth.uid }),
        mode,
      ),
    ),
  );
  profile.patch("/me/deactivate", async (req, res) => {
    req.resume();
    const result = await deactivateAccount(db, auth, req.auth.uid);
    onDeactivate(req.auth.uid);
    res.json(result);
  });
  profile.all("/me/deactivate", (req, res) =>
    res.status(405).json({ error: "Method not allowed" }),
  );
  app.use(profile);
  if (localUploads) app.use(createLocalMediaRouter({ db }));
  app.use(createAlbumRouter({ db, mode }));
  app.use(createFavoriteAlbumsRouter({ db }));
  app.use(createPlaylistRouter({ db }));
  app.use(createSongOwnerRouter({ db, mode }));
  app.use(createLyricRouter({ db, mode }));
  app.use(createSongUploadRouter({ db, mode }));
  app.use(createSocialRouter({ db }));
  app.use(createFeedRouter({ db }));
  app.use(createAccessRouter({ db }));
  app.use(createHistoryReadRouter({ db }));
  app.use(createPlaybackRouter({ db }));
  app.use(createSongReadRouter({ db }));
  app.use(createCatalogReadRouter({ db }));
  return app;
}
function finishHttpApp(app) {
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (!error.status)
      console.error("Backend request failed:", req.method, req.path, {
        code: error.code,
        message: error.message,
      });
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : "Không thể xử lý yêu cầu. Hãy thử lại.",
    });
  });
}
module.exports = { createHttpApp, finishHttpApp };
