const { createHash } = require("node:crypto");
const hash = (text) => createHash("sha256").update(text).digest("hex");
function vector(values, dimensions) {
  if (
    !Array.isArray(values) ||
    values.length !== dimensions ||
    values.some((v) => typeof v !== "number" || !Number.isFinite(v))
  )
    throw Error("Invalid embedding");
  const norm = Math.hypot(...values);
  if (!norm || !Number.isFinite(norm)) throw Error("Invalid embedding norm");
  return values.map((v) => v / norm);
}
function documentText(song) {
  return `Tên: ${song.title || ""}\nNghệ sĩ: ${song.artist || ""}\nThể loại: ${(song.genre || []).join(", ")}`.slice(
    0,
    6000,
  );
}
function createAiSearch({ db, env = process.env, fetchImpl = fetch }) {
  const enabled = env.AI_ENABLED === "true";
  const model = env.AI_EMBEDDING_MODEL || "gemini-embedding-2";
  const dimensions = Number(env.AI_EMBEDDING_DIMENSIONS || 768);
  const limit = Number(env.AI_DAILY_REQUEST_LIMIT || 0);
  const configured =
    enabled &&
    !!env.GEMINI_API_KEY &&
    ["gemini-embedding-2", "gemini-embedding-001"].includes(model) &&
    Number.isInteger(dimensions) &&
    dimensions >= 128 &&
    dimensions <= 3072 &&
    Number.isSafeInteger(limit) &&
    limit > 0;
  const version = `${model}:${dimensions}:metadata-v1`;
  const pending = new Map();
  let busy = false;
  async function embed(text, task, uid) {
    const key = hash(`${version}:${task}:${text}`);
    const pendingKey = task === "query" ? `${uid}:${key}` : key;
    if (pending.has(pendingKey)) return pending.get(pendingKey);
    const work = (async () => {
      const ref = db.doc(`songEmbeddings/${key}`);
      // Query vectors stay scoped to a user; document metadata is public only.
      const cacheRef =
        task === "query"
          ? db.doc(`aiQueryCache/${hash(`${uid}:${key}`)}`)
          : ref;
      const cached = await cacheRef.get();
      if (
        cached.exists &&
        cached.data().version === version &&
        (task !== "query" || cached.data().expiresAt?.toDate?.() > new Date())
      )
        return vector(cached.data().values, dimensions);
      const day = new Date().toISOString().slice(0, 10);
      await db.runTransaction(async (tx) => {
        const usage = db.doc(`aiUsage/embedding_${day}`);
        const snap = await tx.get(usage);
        const count = snap.exists ? snap.data().count : 0;
        if (!Number.isSafeInteger(count) || count < 0 || count >= limit)
          throw Error("AI quota exhausted");
        tx.set(usage, { count: count + 1, day });
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      try {
        const body = {
          content: {
            parts: [
              {
                text:
                  model === "gemini-embedding-2"
                    ? `${task === "query" ? "Retrieve music matching this query" : "Represent this music for retrieval"}:\n${text}`
                    : text,
              },
            ],
          },
          output_dimensionality: dimensions,
          ...(model === "gemini-embedding-001"
            ? {
                taskType:
                  task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
              }
            : {}),
        };
        const response = await fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": env.GEMINI_API_KEY,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
        if (!response.ok) throw Error("Embedding unavailable");
        const data = await response.json();
        const values = vector(data.embedding?.values, dimensions);
        await cacheRef.set({
          version,
          values,
          updatedAt: new Date(),
          ...(task === "query"
            ? { ownerId: uid, expiresAt: new Date(Date.now() + 86400000) }
            : {}),
        });
        return values;
      } finally {
        clearTimeout(timer);
      }
    })();
    // Do not share query promises across users.
    pending.set(pendingKey, work);
    try {
      return await work;
    } finally {
      pending.delete(pendingKey);
    }
  }
  return {
    enabled: configured,
    version,
    async rank(query, lexical, catalog, uid) {
      if (!configured) return { keys: lexical, fallbackReason: "disabled" };
      if (catalog.length > 1000) return { keys: lexical, fallbackReason: "capacity" };
      if (busy) return { keys: lexical, fallbackReason: "busy" };
      busy = true;
      try {
        const candidates = catalog;
        const ranked = [];
        // Search only consumes durable document vectors; indexing is explicit.
        for (let i = 0; i < candidates.length; i += 100) {
          const batch = candidates.slice(i, i + 100);
          const refs = batch.map((s) =>
            db.doc(
              `songEmbeddings/${hash(`${version}:document:${documentText(s)}`)}`,
            ),
          );
          const docs = await db.getAll(...refs);
          docs.forEach((doc, n) => {
            if (!doc.exists || doc.data().version !== version) return;
            try {
              const v = vector(doc.data().values, dimensions);
              ranked.push({
                key: `song:${batch[n].id}`,
                values: v,
              });
            } catch {
              /* A corrupt cached vector must not break keyword search. */
            }
          });
        }
        if (!ranked.length)
          return { keys: lexical, fallbackReason: "index_empty" };
        const q = await embed(query, "query", uid);
        for (const row of ranked)
          row.score = row.values.reduce(
            (sum, value, index) => sum + value * q[index],
            0,
          );
        ranked.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
        const scores = new Map();
        [lexical, ranked.slice(0, 100).map((r) => r.key)].forEach((list) =>
          list.forEach((key, i) =>
            scores.set(key, (scores.get(key) || 0) + 1 / (60 + i)),
          ),
        );
        return {
          keys: [...scores]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([key]) => key),
          fallbackReason: null,
        };
      } catch {
        return { keys: lexical, fallbackReason: "unavailable" };
      } finally {
        busy = false;
      }
    },
    async index(songs) {
      if (!configured)
        throw Error(
          "Configure AI_ENABLED, GEMINI_API_KEY and AI_DAILY_REQUEST_LIMIT first",
        );
      if (songs.length > 1000) throw Error("Index batch exceeds 1000 songs");
      for (const song of songs) await embed(documentText(song), "document");
      return songs.length;
    },
  };
}
module.exports = { createAiSearch, documentText, vector };
