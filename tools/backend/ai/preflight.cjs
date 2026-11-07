const { createAiSearch, vector } = require("./search.cjs");
async function preflight({
  env = process.env,
  fetchImpl = fetch,
  smoke = false,
} = {}) {
  const ready = createAiSearch({ db: null, env, fetchImpl });
  if (!ready.enabled)
    throw Object.assign(new Error("AI configuration incomplete"), {
      safeMessage:
        "Thiếu hoặc sai cấu hình local: " +
        [
          env.AI_ENABLED !== "true" && "AI_ENABLED=true",
          !env.GEMINI_API_KEY && "GEMINI_API_KEY",
          !(Number(env.AI_DAILY_REQUEST_LIMIT) > 0) &&
            "AI_DAILY_REQUEST_LIMIT > 0",
          "kiểm tra AI_EMBEDDING_MODEL / AI_EMBEDDING_DIMENSIONS",
        ]
          .filter(Boolean)
          .join(", ") +
        ". Các biến trên Render không tự có ở máy local; cấu hình file .env.ai.",
    });
  if (!smoke)
    return {
      configured: true,
      inferenceVerified: false,
      version: ready.version,
    };
  const model = env.AI_EMBEDDING_MODEL || "gemini-embedding-2";
  const dimensions = Number(env.AI_EMBEDDING_DIMENSIONS || 768);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          content: {
            parts: [
              {
                text: "Represent this music for retrieval: Bài nhạc không lời nhẹ nhàng.",
              },
            ],
          },
          output_dimensionality: dimensions,
          ...(model === "gemini-embedding-001"
            ? { taskType: "RETRIEVAL_DOCUMENT" }
            : {}),
        }),
        signal: controller.signal,
      },
    );
    if (!response.ok)
      throw Object.assign(
        Error(
          `Model chưa sẵn sàng (HTTP ${response.status}). Kiểm tra quyền, model và quota trong AI Studio.`,
        ),
        {
          safeMessage: `Model chưa sẵn sàng (HTTP ${response.status}). Kiểm tra quyền, model và quota trong AI Studio.`,
        },
      );
    const body = await response.json();
    vector(body.embedding?.values, dimensions);
    return {
      configured: true,
      inferenceVerified: true,
      version: ready.version,
      dimensions,
    };
  } finally {
    clearTimeout(timer);
  }
}
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((a) => a !== "--smoke")) {
    console.error("Usage: npm run ai:check -- [--smoke]");
    process.exitCode = 1;
  } else
    preflight({ smoke: args.includes("--smoke") })
      .then((result) => console.log(JSON.stringify(result)))
      .catch((error) => {
        console.error(
          error.safeMessage ||
            "AI preflight chưa đạt. Kiểm tra kết nối hoặc định dạng phản hồi model. Không gửi key vào chat.",
        );
        process.exitCode = 1;
      });
}
module.exports = { preflight };
