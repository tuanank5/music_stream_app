const { verifyAudio } = require("../audio-assets.cjs");
const fail = (message, details = {}) =>
  Object.assign(new Error(message), details);
const BASE = "https://generativelanguage.googleapis.com";
function parseTranscript(result) {
  const invalid = (reason) => {
    throw fail("Invalid transcription result", { parseReason: reason });
  };
  if (!result || typeof result !== "object" || Array.isArray(result))
    invalid("INVALID_RESPONSE");
  if (result.status != null && result.status !== "completed")
    invalid("NOT_COMPLETED");
  let parts;
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    parts = [result.output_text];
  } else if (Array.isArray(result.steps)) {
    // Ignore user input, thoughts and tool results in the step timeline.
    parts = result.steps
      .filter((step) => step?.type === "model_output")
      .flatMap((step) => (Array.isArray(step.content) ? step.content : []));
  } else if (Array.isArray(result.outputs)) {
    // REST responses using the earlier Interactions schema expose flat outputs.
    parts = result.outputs;
  } else if (typeof result.output_text === "string") {
    parts = [];
  } else {
    invalid("UNSUPPORTED_RESPONSE");
  }
  const text = parts
    .flatMap((part) => {
      if (typeof part === "string") return [part];
      return part?.type === "text" && typeof part.text === "string"
        ? [part.text]
        : [];
    })
    .join("\n")
    .trim();
  if (!text) invalid("EMPTY_TRANSCRIPT");
  if (text.length > 12000) invalid("TRANSCRIPT_TOO_LONG");
  return text;
}
async function runTranscription({
  uid,
  song,
  env = process.env,
  request = fetch,
  verify = verifyAudio,
  context,
}) {
  if (
    env.AI_TRANSCRIBE_MODEL !== "gemini-3.5-transcribe" ||
    !env.GEMINI_API_KEY
  )
    throw fail("Transcription is not configured");
  context.stage = "verify_audio";
  const verified = await verify(uid, song.audioPublicId, request);
  if (verified.duration > 300 || verified.duration > song.durationSeconds + 1)
    throw fail("Demo transcription supports up to 5 minutes");
  context.stage = "download_audio";
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
  context.stage = "detect_format";
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
    if (!result.ok) {
      const body = await result.json().catch(() => null);
      const allowed = new Set([
        "INVALID_ARGUMENT",
        "UNAUTHENTICATED",
        "PERMISSION_DENIED",
        "NOT_FOUND",
        "RESOURCE_EXHAUSTED",
        "INTERNAL",
        "UNAVAILABLE",
        "DEADLINE_EXCEEDED",
      ]);
      throw fail("Transcription provider unavailable", {
        status: result.status,
        providerStatus: allowed.has(body?.error?.status)
          ? body.error.status
          : "UNKNOWN",
      });
    }
    return result;
  };
  let name;
  try {
    context.stage = "start_upload";
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
    context.stage = "upload_audio";
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
    context.stage = "process_file";
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
    context.stage = "transcribe";
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
    context.stage = "parse_result";
    return parseTranscript(result);
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
async function transcribeSong(options) {
  const context = { stage: "config" };
  try {
    return await runTranscription({ ...options, context });
  } catch (error) {
    error.stage = context.stage;
    throw error;
  }
}
module.exports = { transcribeSong, parseTranscript };
