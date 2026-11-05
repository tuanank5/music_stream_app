const invalid = () =>
  Object.assign(new Error("Telemetry phát nhạc không hợp lệ."), {
    status: 400,
  });
function mergeCoverage(ranges) {
  const merged = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  if (merged.length > 1024) throw invalid();
  return merged;
}
// elapsedSeconds is measured by the server, never supplied by the client.
// The route must validate session identity/duration and commit state atomically.
function advancePlayback(previous, packet, durationSeconds, elapsedSeconds) {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    durationSeconds > 86400 ||
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0 ||
    !packet ||
    typeof packet !== "object" ||
    Array.isArray(packet) ||
    Object.keys(packet).some(
      (key) => !["sequence", "progressSeconds", "ranges"].includes(key),
    ) ||
    !Number.isSafeInteger(packet.sequence) ||
    packet.sequence < 1 ||
    !Number.isFinite(packet.progressSeconds) ||
    packet.progressSeconds < 0 ||
    packet.progressSeconds > durationSeconds ||
    !Array.isArray(packet.ranges) ||
    packet.ranges.length > 120
  )
    throw invalid();
  for (const range of packet.ranges)
    if (
      !Array.isArray(range) ||
      range.length !== 2 ||
      !range.every(Number.isFinite) ||
      range[0] < 0 ||
      range[1] > durationSeconds ||
      range[1] <= range[0] ||
      range[1] - range[0] > 3
    )
      throw invalid();
  const state = previous || {
    sequence: 0,
    listenedSeconds: 0,
    coverage: [],
    completed: false,
    progressSeconds: 0,
  };
  if (packet.sequence <= state.sequence) return state;
  if (packet.sequence !== state.sequence + 1)
    throw Object.assign(
      new Error("Telemetry sai thứ tự. Hãy gửi lại gói trước."),
      { status: 409 },
    );
  const heard = packet.ranges.reduce(
    (sum, [start, end]) => sum + end - start,
    0,
  );
  // No allowance is carried from pause/buffering or a previous request.
  if (heard > elapsedSeconds + 0.001) throw invalid();
  const coverage = mergeCoverage([...state.coverage, ...packet.ranges]);
  const covered = coverage.reduce((sum, [start, end]) => sum + end - start, 0);
  return {
    sequence: packet.sequence,
    progressSeconds: packet.progressSeconds,
    listenedSeconds: state.listenedSeconds + heard,
    coverage,
    completed:
      state.completed ||
      (covered >= durationSeconds * 0.8 &&
        packet.progressSeconds >=
          durationSeconds - Math.min(0.25, durationSeconds * 0.01)),
  };
}
function mayCountPlayback(
  state,
  durationSeconds,
  alreadyCounted,
  nowMs,
  lastCountedAtMs = null,
) {
  if (
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0 ||
    !Number.isFinite(nowMs) ||
    (lastCountedAtMs !== null && !Number.isFinite(lastCountedAtMs))
  )
    throw invalid();
  return (
    !alreadyCounted &&
    (durationSeconds < 30
      ? state.completed === true
      : state.listenedSeconds >= 30) &&
    (lastCountedAtMs === null || nowMs - lastCountedAtMs >= 30000)
  );
}
module.exports = { mergeCoverage, advancePlayback, mayCountPlayback };
