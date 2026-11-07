const { documentText } = require("./search.cjs");
// Coalesce pending work by song ID and ignore changes to non-embedded fields.
function startAiIndex({ ai, getSongs, isClosed, report = console.info }) {
  const state = { status: ai.enabled ? "indexing" : "disabled", indexed: 0 };
  const desired = new Map(),
    completed = new Map(),
    pending = new Map();
  const failures = new Map();
  let stopped = false,
    running = null,
    timer,
    retryAt = 0;
  const closed = () => stopped || isClosed();
  function reconcile() {
    const songs = getSongs();
    if (songs.length > 1000) throw Error("AI index capacity exceeded");
    const next = new Map(songs.map((song) => [song.id, documentText(song)]));
    for (const id of desired.keys())
      if (!next.has(id)) {
        desired.delete(id);
        pending.delete(id);
        completed.delete(id);
        failures.delete(id);
      }
    for (const song of songs) {
      const text = next.get(song.id);
      desired.set(song.id, text);
      const failure = failures.get(song.id);
      if (
        completed.get(song.id) !== text &&
        !(failure?.text === text && failure.until > Date.now())
      )
        pending.set(song.id, { song, text });
      else pending.delete(song.id);
    }
  }
  async function flush() {
    clearTimeout(timer);
    if (!ai.enabled || closed()) return;
    if (Date.now() < retryAt) return;
    try {
      reconcile();
    } catch {
      state.status = "unavailable";
      report(
        "AI index exceeds demo capacity; keyword search remains available.",
      );
      return;
    }
    if (running) return running;
    running = (async () => {
      let failed = false;
      state.status = "indexing";
      while (pending.size && !closed()) {
        const [id, job] = pending.entries().next().value;
        pending.delete(id);
        if (desired.get(id) !== job.text || completed.get(id) === job.text)
          continue;
        try {
          await ai.index([job.song], {
            shouldContinue: () => !closed() && desired.get(id) === job.text,
          });
          if (!closed() && desired.get(id) === job.text) {
            completed.set(id, job.text);
            failures.delete(id);
            state.indexed++;
          }
        } catch {
          failed = true;
          failures.set(id, { text: job.text, until: Date.now() + 60000 });
          // Stop this pass on provider/quota errors instead of spending a
          // failed request for every remaining song. A later change can retry.
          retryAt = Date.now() + 60000;
          pending.clear();
          break;
        }
      }
      state.status = closed() ? "stopped" : failed ? "unavailable" : "ready";
      report(
        failed
          ? "AI index unavailable. Check model access or daily quota; keyword search remains available. Cached vectors are retained for the next deploy."
          : `AI index: ${state.status}, ${state.indexed} public songs processed.`,
      );
    })();
    try {
      await running;
    } finally {
      running = null;
    }
  }
  const done = flush();
  return {
    state,
    done,
    flush,
    refresh() {
      if (!ai.enabled || closed()) return;
      // Revoke pending work immediately, before a debounce can expire.
      try {
        reconcile();
      } catch {
        pending.clear();
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        void flush();
      }, 200);
      timer.unref?.();
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
      pending.clear();
      desired.clear();
      failures.clear();
      state.status = "stopped";
    },
  };
}
module.exports = { startAiIndex };
