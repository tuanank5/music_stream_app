const { verifyAudio } = require("../audio-assets.cjs");
const { transcribeSong } = require("./transcribe.cjs");
const fail = (status, message) => Object.assign(new Error(message), { status });
function createLyricGenerator({
  db,
  env = process.env,
  verify = verifyAudio,
  transcribe = transcribeSong,
  now = () => Date.now(),
  report = (details) => console.error("Lyric generation failed", details),
}) {
  const limit = Number(env.AI_DAILY_AUDIO_SECONDS || 0);
  const enabled =
    env.AI_ENABLED === "true" &&
    env.AI_LYRICS_ENABLED === "true" &&
    !!env.GEMINI_API_KEY &&
    env.AI_TRANSCRIBE_MODEL === "gemini-3.5-transcribe" &&
    Number.isSafeInteger(limit) &&
    limit > 0;
  const active = new Map();
  async function account(uid) {
    const user = await db.doc(`users/${uid}`).get();
    if (!user.exists || user.data().active === false)
      throw fail(403, "Tài khoản không hoạt động.");
  }
  async function generate(uid, publicId, consent) {
    if (!enabled)
      throw fail(503, "Tạo lời nháp chưa được bật hoặc chưa có hạn mức.");
    if (consent !== true)
      throw fail(400, "Cần đồng ý xử lý audio để tạo lời nháp.");
    if (
      typeof publicId !== "string" ||
      !publicId.startsWith(`musicstream/${uid}/audio/`) ||
      publicId.includes("..") ||
      !/^[A-Za-z0-9_/-]{1,512}$/.test(publicId)
    )
      throw fail(403, "Audio không thuộc vùng tải lên của bạn.");
    const key = `${uid}:${publicId}`;
    if (active.has(key)) return active.get(key);
    if (active.size)
      throw fail(429, "Đang tạo lời cho audio khác. Hãy thử lại sau.");
    const work = Promise.resolve().then(async () => {
      await account(uid);
      const asset = await verify(uid, publicId);
      if (
        !Number.isFinite(asset.duration) ||
        asset.duration <= 0 ||
        asset.duration > 300
      )
        throw fail(400, "Demo tạo lời hỗ trợ audio tối đa 5 phút.");
      const userRef = db.doc(`users/${uid}`);
      const day = new Date(now()).toISOString().slice(0, 10),
        usage = db.doc(`aiUsage/lyrics_${day}`);
      await db.runTransaction(async (tx) => {
        const [user, snapshot] = await Promise.all([
          tx.get(userRef),
          tx.get(usage),
        ]);
        if (!user.exists || user.data().active === false)
          throw fail(403, "Tài khoản không hoạt động.");
        const used = snapshot.exists ? snapshot.data().seconds : 0,
          seconds = Math.ceil(asset.duration);
        if (!Number.isSafeInteger(used) || used < 0 || used + seconds > limit)
          throw fail(429, "Đã hết hạn mức tạo lời nháp hôm nay.");
        // Only usage is persisted. Neither audio metadata nor generated text is saved.
        tx.set(usage, { day, seconds: used + seconds });
      });
      try {
        const text = await transcribe({
          uid,
          song: {
            audioPublicId: publicId,
            audioUrl: asset.url,
            durationSeconds: asset.duration,
          },
          env,
        });
        if (typeof text !== "string" || text.length > 12000)
          throw Error("Invalid lyric result");
        await account(uid);
        return { text: text.trim() };
      } catch (error) {
        const stages = new Set([
          "config",
          "verify_audio",
          "download_audio",
          "detect_format",
          "start_upload",
          "upload_audio",
          "process_file",
          "transcribe",
          "parse_result",
        ]);
        const codes = new Set([
          "INVALID_ARGUMENT",
          "UNAUTHENTICATED",
          "PERMISSION_DENIED",
          "NOT_FOUND",
          "RESOURCE_EXHAUSTED",
          "INTERNAL",
          "UNAVAILABLE",
          "DEADLINE_EXCEEDED",
        ]);
        const status =
          Number.isInteger(error.status) &&
          error.status >= 100 &&
          error.status <= 599
            ? error.status
            : null;
        const parseReasons = new Set([
          "INVALID_RESPONSE",
          "NOT_COMPLETED",
          "UNSUPPORTED_RESPONSE",
          "EMPTY_TRANSCRIPT",
          "TRANSCRIPT_TOO_LONG",
        ]);
        report({
          stage: stages.has(error.stage) ? error.stage : "response",
          status,
          code: codes.has(error.providerStatus)
            ? error.providerStatus
            : "UNKNOWN",
          ...(error.stage === "parse_result" &&
          parseReasons.has(error.parseReason)
            ? { reason: error.parseReason }
            : {}),
        });
        throw fail(
          status === 429 ? 429 : 503,
          status === 429
            ? "Đã đạt giới hạn tạo lời nháp. Vui lòng thử lại sau."
            : "Chưa tạo được lời nháp. Vui lòng thử lại sau hoặc nhập lời thủ công.",
        );
      }
    });
    active.set(key, work);
    try {
      return await work;
    } finally {
      active.delete(key);
    }
  }
  return { enabled, generate };
}
module.exports = { createLyricGenerator };
