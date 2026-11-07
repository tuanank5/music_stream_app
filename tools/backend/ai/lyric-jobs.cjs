const { createHash } = require("node:crypto");
const { transcribeSong } = require("./transcribe.cjs");
const { verifyAudio } = require("../audio-assets.cjs");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const fail = (status, message) => Object.assign(new Error(message), { status });
const sourceVersion = (song) =>
  hash(
    JSON.stringify([song.audioPublicId, song.audioUrl, song.durationSeconds]),
  );
function createLyricJobs({
  db,
  env = process.env,
  transcribe = transcribeSong,
  now = () => Date.now(),
  verify = verifyAudio,
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
  function refs(uid, id) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(id))
      throw fail(400, "ID bài hát không hợp lệ.");
    return {
      song: db.doc(`lyricUploadSources/${id}`),
      user: db.doc(`users/${uid}`),
      job: db.doc(`lyricJobs/${hash(`${uid}:${id}`)}`),
    };
  }
  function own(user, song, uid) {
    if (!user.exists || user.data().active === false)
      throw fail(403, "Tài khoản không hoạt động.");
    if (!song.exists || song.data().active !== true)
      throw fail(404, "Bài hát không còn khả dụng.");
    if (song.data().artistId !== uid)
      throw fail(403, "Bạn không sở hữu bài hát này.");
  }
  function dto(value, song) {
    if (!value || value.sourceVersion !== sourceVersion(song)) return null;
    const expired = value.status === "processing" && value.leaseUntil <= now();
    return {
      status: expired ? "interrupted" : value.status,
      text: value.status === "completed" ? value.text || "" : "",
      error: expired
        ? "Tác vụ bị gián đoạn. Bạn có thể tạo lại."
        : value.error || "",
      draftId: value.id,
    };
  }
  async function read(uid, id) {
    const r = refs(uid, id);
    const [user, song, job] = await Promise.all([
      r.user.get(),
      r.song.get(),
      r.job.get(),
    ]);
    own(user, song, uid);
    return { enabled, job: dto(job.exists ? job.data() : null, song.data()) };
  }
  async function start(uid, id, consent) {
    if (!enabled)
      throw fail(503, "Tạo lời nháp chưa được bật hoặc chưa có hạn mức.");
    if (consent !== true)
      throw fail(400, "Cần đồng ý gửi audio tới Gemini để tạo lời nháp.");
    const r = refs(uid, id),
      key = r.job.path;
    if (active.has(key)) return read(uid, id);
    if (active.size >= 1)
      throw fail(429, "Đang tạo lời cho bài khác. Hãy thử lại sau.");
    active.set(key, null);
    let launched = false;
    try {
      const job = await db.runTransaction(async (tx) => {
        const [user, song, previous] = await Promise.all([
          tx.get(r.user),
          tx.get(r.song),
          tx.get(r.job),
        ]);
        own(user, song, uid);
        const s = song.data(),
          version = sourceVersion(s),
          old = previous.exists ? previous.data() : null;
        if (
          old?.sourceVersion === version &&
          (old.status === "completed" ||
            (old.status === "processing" && old.leaseUntil > now()))
        )
          return null;
        if (
          !Number.isFinite(s.durationSeconds) ||
          s.durationSeconds <= 0 ||
          s.durationSeconds > 300 ||
          typeof s.audioPublicId !== "string" ||
          !s.audioPublicId.startsWith(`musicstream/${uid}/audio/`)
        )
          throw fail(400, "Demo tạo lời hỗ trợ audio cloud tối đa 5 phút.");
        const day = new Date(now()).toISOString().slice(0, 10),
          usage = db.doc(`aiUsage/lyrics_${day}`),
          snapshot = await tx.get(usage);
        const used = snapshot.exists ? snapshot.data().seconds : 0,
          seconds = Math.ceil(s.durationSeconds);
        if (!Number.isSafeInteger(used) || used < 0 || used + seconds > limit)
          throw fail(429, "Đã hết hạn mức tạo lời nháp hôm nay.");
        const value = {
          id: hash(`${key}:${now()}:${Math.random()}`),
          ownerId: uid,
          uploadSourceId: id,
          sourceVersion: version,
          status: "processing",
          text: "",
          error: "",
          createdAt: new Date(now()),
          expiresAt: new Date(now() + 7 * 86400000),
          leaseUntil: now() + 600000,
          model: env.AI_TRANSCRIBE_MODEL,
        };
        tx.set(usage, { day, seconds: used + seconds });
        tx.set(r.job, value);
        return { value, song: s };
      });
      if (!job) return read(uid, id);
      launched = true;
      const work = Promise.resolve().then(async () => {
        try {
          // Recheck immediately before transmitting private media to provider.
          const current = await read(uid, id);
          if (current.job?.draftId !== job.value.id)
            throw Error("Source changed");
          const text = await transcribe({ uid, song: job.song, env });
          if (typeof text !== "string" || text.length > 12000)
            throw Error("Invalid lyric text");
          await db.runTransaction(async (tx) => {
            const [user, song, current] = await Promise.all([
              tx.get(r.user),
              tx.get(r.song),
              tx.get(r.job),
            ]);
            own(user, song, uid);
            if (
              !current.exists ||
              current.data().id !== job.value.id ||
              sourceVersion(song.data()) !== job.value.sourceVersion
            )
              throw Error("Source changed");
            tx.update(r.job, {
              status: "completed",
              text: text.trim(),
              error: "",
              leaseUntil: 0,
            });
          });
        } catch {
          await db
            .runTransaction(async (tx) => {
              const current = await tx.get(r.job);
              if (current.exists && current.data().id === job.value.id)
                tx.update(r.job, {
                  status: "failed",
                  error:
                    "Chưa tạo được lời nháp. Kiểm tra model, quota hoặc thử lại sau.",
                  leaseUntil: 0,
                });
            })
            .catch(() => {});
        } finally {
          active.delete(key);
        }
      });
      active.set(key, work);
      return { enabled, job: dto(job.value, job.song) };
    } finally {
      if (!launched) active.delete(key);
    }
  }
  function uploadId(uid, publicId) {
    if (
      typeof publicId !== "string" ||
      !publicId.startsWith("musicstream/" + uid + "/audio/") ||
      publicId.includes("..") ||
      !/^[A-Za-z0-9_/-]{1,512}$/.test(publicId)
    )
      throw fail(403, "Audio không thuộc vùng tải lên của bạn.");
    return hash(uid + ":" + publicId);
  }
  async function readUpload(uid, publicId) {
    const id = uploadId(uid, publicId),
      r = refs(uid, id);
    const user = await r.user.get();
    if (!user.exists || user.data().active === false)
      throw fail(403, "Tài khoản không hoạt động.");
    if (!(await r.song.get()).exists) return { enabled, job: null };
    return read(uid, id);
  }
  async function startUpload(uid, publicId, consent) {
    if (!enabled)
      throw fail(503, "Tạo lời nháp chưa được bật hoặc chưa có hạn mức.");
    if (consent !== true)
      throw fail(400, "Cần đồng ý gửi audio tới Gemini để tạo lời nháp.");
    const id = uploadId(uid, publicId),
      existing = await readUpload(uid, publicId);
    if (
      existing.job &&
      ["processing", "completed"].includes(existing.job.status)
    )
      return existing;
    const asset = await verify(uid, publicId);
    if (
      !Number.isFinite(asset.duration) ||
      asset.duration <= 0 ||
      asset.duration > 300
    )
      throw fail(400, "Demo tạo lời hỗ trợ audio tối đa 5 phút.");
    const r = refs(uid, id);
    await db.runTransaction(async (tx) => {
      const user = await tx.get(r.user);
      if (!user.exists || user.data().active === false)
        throw fail(403, "Tài khoản không hoạt động.");
      tx.set(r.song, {
        artistId: uid,
        active: true,
        audioPublicId: publicId,
        audioUrl: asset.url,
        durationSeconds: asset.duration,
        expiresAt: new Date(now() + 7 * 86400000),
      });
    });
    return start(uid, id, true);
  }

  return {
    enabled,
    readUpload,
    startUpload,
    settle: () => Promise.all([...active.values()].filter(Boolean)),
  };
}
module.exports = { createLyricJobs };
