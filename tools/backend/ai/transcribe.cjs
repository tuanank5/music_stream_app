const { verifyAudio } = require("../audio-assets.cjs");
const fail = (message) => new Error(message);
const BASE = "https://generativelanguage.googleapis.com";
async function transcribeSong({
  uid,
  song,
  env = process.env,
  request = fetch,
  verify = verifyAudio,
}) {
  if (
    env.AI_TRANSCRIBE_MODEL !== "gemini-3.5-transcribe" ||
    !env.GEMINI_API_KEY
  )
    throw fail("Transcription is not configured");
  const verified = await verify(uid, song.audioPublicId, request);
  if (verified.duration > 300 || verified.duration > song.durationSeconds + 1)
    throw fail("Demo transcription supports up to 5 minutes");
  const audio = await request(verified.url, {
    redirect: "error",
    signal: AbortSignal.timeout(30000),
  });
  if (!audio.ok || !audio.body) throw fail("Audio unavailable");
  const reader = audio.body.getReader(),
    chunks = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 30 * 1024 * 1024) throw fail("Audio too large");
      chunks.push(Buffer.from(part.value));
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const bytes = Buffer.concat(chunks, size);
  const { fileTypeFromBuffer } = await import("file-type");
  const detected = await fileTypeFromBuffer(bytes);
  if (
    !detected ||
    !["mp3", "wav", "flac", "ogg", "m4a", "mp4"].includes(detected.ext)
  )
    throw fail("Audio format unsupported");
  const mime =
    detected.ext === "mp4" || detected.ext === "m4a"
      ? "audio/m4a"
      : detected.mime;
  const headers = { "x-goog-api-key": env.GEMINI_API_KEY };
  const checked = async (url, options) => {
    const result = await request(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(90000),
    });
    if (!result.ok)
      throw fail(`Transcription provider unavailable (${result.status})`);
    return result;
  };
  let name;
  try {
    const start = await checked(`${BASE}/upload/v1beta/files`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(size),
        "X-Goog-Upload-Header-Content-Type": mime,
      },
      body: JSON.stringify({ file: { display_name: "lyric-draft" } }),
    });
    const upload = new URL(start.headers.get("x-goog-upload-url"));
    if (
      upload.origin !== BASE ||
      !upload.pathname.startsWith("/upload/") ||
      upload.username ||
      upload.password
    )
      throw fail("Invalid provider upload URL");
    let file = (
      await (
        await checked(upload.href, {
          method: "POST",
          headers: {
            "Content-Type": mime,
            "X-Goog-Upload-Offset": "0",
            "X-Goog-Upload-Command": "upload, finalize",
          },
          body: bytes,
        })
      ).json()
    ).file;
    if (!/^files\/[a-z0-9-]{1,40}$/.test(file?.name))
      throw fail("Invalid provider file");
    name = file.name;
    for (
      let attempt = 0;
      file.state === "PROCESSING" && attempt < 5;
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      file = await (
        await checked(`${BASE}/v1beta/${name}`, { headers })
      ).json();
    }
    if (file.state !== "ACTIVE" || file.uri !== `${BASE}/v1beta/${name}`)
      throw fail("Provider file not ready");
    const result = await (
      await checked(`${BASE}/v1beta/interactions`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: env.AI_TRANSCRIBE_MODEL,
          store: false,
          input: [{ type: "audio", uri: file.uri, mime_type: mime }],
          generation_config: {
            transcription_config: { mode: { type: "verbatim" } },
          },
        }),
      })
    ).json();
    if (
      (result.status && result.status !== "completed") ||
      (typeof result.output_text !== "string" && !Array.isArray(result.steps))
    )
      throw fail("Invalid transcription response");
    const text =
      typeof result.output_text === "string"
        ? result.output_text
        : (result.steps || [])
            .filter((s) => s.type === "model_output")
            .flatMap((s) => s.content || [])
            .filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => c.text)
            .join("\n");
    if (typeof text !== "string" || text.length > 12000)
      throw fail("Invalid transcription result");
    return text.trim();
  } finally {
    if (name)
      await request(`${BASE}/v1beta/${name}`, {
        method: "DELETE",
        headers,
        redirect: "error",
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});
  }
}
module.exports = { transcribeSong };
