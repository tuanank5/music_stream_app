function startAiIndex({ ai, getSongs, isClosed, report = console.info }) {
  const state = { status: ai.enabled ? "indexing" : "disabled", indexed: 0 };
  const done = (async () => {
    if (!ai.enabled) return;
    try {
      const songs = getSongs();
      state.indexed = await ai.index(songs, {
        shouldContinue: () => !isClosed(),
      });
      state.status = isClosed() ? "stopped" : "ready";
      report(
        `AI index: ${state.status}, ${state.indexed} public songs processed.`,
      );
    } catch {
      state.status = "unavailable";
      report(
        "AI index unavailable. Check model access or daily quota; keyword search remains available. Cached vectors are retained for the next deploy.",
      );
    }
  })();
  return { state, done };
}
module.exports = { startAiIndex };
