const express = require("express");
const { createLyricJobs } = require("./lyric-jobs.cjs");
function createLyricRouter({ db, mode, service = createLyricJobs({ db }) }) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/audio-lyric-config", (req, res) =>
    res.json({ enabled: service.enabled, maxDurationSeconds: 300 }),
  );
  router.get("/audio-lyric-job", async (req, res) =>
    res.json(await service.readUpload(req.auth.uid, req.query.publicId)),
  );
  router.post(
    "/audio-lyric-job",
    express.json({ limit: "2kb" }),
    async (req, res) => {
      if (mode !== "cloud")
        return res
          .status(503)
          .json({ error: "Tạo lời từ Gemini chỉ bật trên backend cloud." });
      if (
        !req.body ||
        Object.keys(req.body).some(
          (k) => !["audioPublicId", "consent"].includes(k),
        )
      )
        return res.status(400).json({ error: "Yêu cầu tạo lời không hợp lệ." });
      res
        .status(202)
        .json(
          await service.startUpload(
            req.auth.uid,
            req.body.audioPublicId,
            req.body.consent,
          ),
        );
    },
  );
  return router;
}
module.exports = { createLyricRouter };
