const express = require("express");
const { createLyricGenerator } = require("./lyric-generator.cjs");
function createLyricRouter({
  db,
  mode,
  service = createLyricGenerator({ db }),
}) {
  const router = express.Router({ caseSensitive: true, strict: true });
  router.get("/audio-lyric-config", (req, res) =>
    res.json({ enabled: service.enabled, maxDurationSeconds: 300 }),
  );
  router.post(
    "/audio-lyric",
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
        .status(200)
        .json(
          await service.generate(
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
