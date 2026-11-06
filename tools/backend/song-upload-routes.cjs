const express = require("express");
const { createOwnedSong, validateSongInput } = require("./song-create.cjs");
const { audioUploadConfig, verifyAudio } = require("./audio-assets.cjs");
const { ownedMedia } = require("./local-media.cjs");
function createSongUploadRouter({ db, mode }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/audio-upload-config", (req, res) => {
    if (mode === "emulator")
      return res
        .status(403)
        .json({ error: "Local không tải file ra Cloudinary." });
    res.json(audioUploadConfig(req.auth.uid));
  });
  router.post("/songs", express.json({ limit: "32kb" }), async (req, res) => {
    const input = validateSongInput(req.body, { uid: req.auth.uid, mode });
    const audio =
      mode === "emulator"
        ? ownedMedia(req.auth.uid, input.audioPublicId, "audio")
        : await verifyAudio(req.auth.uid, input.audioPublicId);
    const result = await createOwnedSong(db, req.auth.uid, input, audio, {
      local: mode === "emulator",
    });
    res.status(result.reused ? 200 : 201).json(result);
  });
  return router;
}
module.exports = { createSongUploadRouter };
