// Temporary LAN-only media store. Never mounted in cloud mode.
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");
const express = require("express");
const multer = require("multer");
const ROOT = path.resolve(__dirname, "../../.local/uploads");
const FILE = /^[a-f0-9-]{36}\.(?:mp3|wav|flac|ogg|m4a|jpg|png|webp)$/;
const fail = (status, message) => Object.assign(new Error(message), { status });
function localMediaPath(value) {
  return typeof value === "string" &&
    value.startsWith("/local-media/") &&
    FILE.test(value.slice(13))
    ? value.slice(13)
    : null;
}
function ownedMedia(uid, value, kind) {
  const filename = localMediaPath(value);
  if (!filename) throw fail(400, "Đường dẫn media local không hợp lệ.");
  let metadata;
  try {
    metadata = JSON.parse(
      fs.readFileSync(path.join(ROOT, filename + ".json"), "utf8"),
    );
  } catch {
    throw fail(404, "File local không còn tồn tại.");
  }
  if (metadata.ownerId !== uid || metadata.kind !== kind)
    throw fail(403, "File không thuộc tài khoản hoặc loại media này.");
  if (!fs.existsSync(path.join(ROOT, filename)))
    throw fail(404, "File local không còn tồn tại.");
  return metadata;
}
function imageUrl(value, uid, mode) {
  if (typeof value === "string" && value.startsWith("/local-media/")) {
    if (mode !== "emulator") throw fail(400, "Cloud không nhận file local.");
    ownedMedia(uid, value, "image");
    return value;
  }
  return value;
}
function mountLocalMediaFiles(app) {
  app.get("/local-media/:filename", (req, res, next) => {
    if (!FILE.test(req.params.filename)) return res.sendStatus(404);
    res.sendFile(
      req.params.filename,
      { root: ROOT, dotfiles: "deny", cacheControl: false },
      (error) => {
        if (error)
          next(fail(error.status || 404, "File local không còn tồn tại."));
      },
    );
  });
}
function createLocalMediaRouter({ db }) {
  const router = express.Router();
  let active = 0;
  router.post("/local-media/upload/:kind", async (req, res) => {
    const kind =
      req.params.kind === "audio"
        ? "audio"
        : req.params.kind === "image"
          ? "image"
          : null;
    if (!kind) throw fail(400, "Loại upload không hợp lệ.");
    if (active >= 2) throw fail(429, "Đang xử lý upload khác. Hãy thử lại.");
    const user = await db.doc(`users/${req.auth.uid}`).get();
    if (!user.exists || user.data().active === false)
      throw fail(403, "Tài khoản không hoạt động.");
    if (active >= 2) throw fail(429, "Đang xử lý upload khác. Hãy thử lại.");
    active++;
    try {
      const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
          fileSize: (kind === "audio" ? 30 : 5) * 1024 * 1024,
          files: 1,
          fields: 0,
          parts: 1,
        },
      }).single("file");
      await new Promise((resolve, reject) =>
        upload(req, res, (error) =>
          error
            ? reject(fail(400, "File quá lớn hoặc multipart không hợp lệ."))
            : resolve(),
        ),
      );
      if (!req.file?.buffer?.length) throw fail(400, "Chưa chọn file.");
      const { fileTypeFromBuffer } = await import("file-type");
      const detected = await fileTypeFromBuffer(req.file.buffer);
      const allowed =
        kind === "audio"
          ? ["mp3", "wav", "flac", "ogg", "m4a"]
          : ["jpg", "png", "webp"];
      if (!detected || !allowed.includes(detected.ext))
        throw fail(
          400,
          "Định dạng chưa hỗ trợ. Audio: MP3/WAV/FLAC/OGG/M4A; ảnh: JPG/PNG/WebP.",
        );
      let duration = 0;
      if (kind === "audio") {
        try {
          const { parseBuffer, TrackType } = await import("music-metadata");
          const metadata = await parseBuffer(
            req.file.buffer,
            { mimeType: detected.mime, size: req.file.size },
            { duration: true },
          );
          duration = metadata.format.duration;
          if (
            metadata.format.trackInfo?.some(
              (track) => track.type === TrackType.video,
            )
          )
            throw Error();
        } catch {
          throw fail(
            400,
            "Không đọc được metadata audio hoặc file chứa video.",
          );
        }
        if (!Number.isFinite(duration) || duration <= 0 || duration > 10800)
          throw fail(400, "Thời lượng audio không hợp lệ hoặc vượt 180 phút.");
      }
      const stillActive = await db.doc(`users/${req.auth.uid}`).get();
      if (!stillActive.exists || stillActive.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      const filename = `${randomUUID()}.${detected.ext}`;
      const result = {
        url: `/local-media/${filename}`,
        publicId: `/local-media/${filename}`,
        duration,
      };
      fs.mkdirSync(ROOT, { recursive: true });
      fs.writeFileSync(path.join(ROOT, filename), req.file.buffer, {
        flag: "wx",
      });
      try {
        fs.writeFileSync(
          path.join(ROOT, filename + ".json"),
          JSON.stringify({
            ...result,
            ownerId: req.auth.uid,
            kind,
            bytes: req.file.size,
            createdAt: new Date().toISOString(),
          }),
          { flag: "wx" },
        );
      } catch (error) {
        fs.unlinkSync(path.join(ROOT, filename));
        throw error;
      }
      res.status(201).json(result);
    } finally {
      active--;
    }
  });
  return router;
}
module.exports = {
  ROOT,
  localMediaPath,
  ownedMedia,
  imageUrl,
  mountLocalMediaFiles,
  createLocalMediaRouter,
};
