function diversify(ids, byId, limit) {
  const result = [],
    remaining = [...ids],
    counts = new Map();
  while (remaining.length && result.length < limit) {
    let index = remaining.findIndex(
      (id) =>
        (counts.get(byId.get(id).artistId) || 0) < 2 &&
        byId.get(id).artistId !== byId.get(result.at(-1))?.artistId,
    );
    if (index < 0)
      index = remaining.findIndex(
        (id) => (counts.get(byId.get(id).artistId) || 0) < 2,
      );
    const id = remaining.splice(index < 0 ? 0 : index, 1)[0],
      artist = byId.get(id).artistId;
    result.push(id);
    counts.set(artist, (counts.get(artist) || 0) + 1);
  }
  return result;
}
async function recommendSimilar({
  source,
  catalog,
  readVectors,
  enabled,
  limit = 8,
}) {
  // Never use a private source as a public recommendation seed.
  const available = [
    ...new Map(
      catalog
        .filter((s) => s.active === true && s.isPublic === true)
        .map((s) => [s.id, s]),
    ).values(),
  ];
  if (
    !source?.active ||
    !source.isPublic ||
    !available.some((s) => s.id === source.id)
  )
    return { keys: [], fallbackReason: "source_unavailable" };
  const byId = new Map(available.map((s) => [s.id, s]));
  const genres = new Set(source.genre || []);
  const taste = (s) =>
    (s.genre || []).filter((g) => genres.has(g)).length * 3 +
    (s.artistId === source.artistId ? 1 : 0);
  const candidates = available.filter((s) => s.id !== source.id);
  const baseline = [...candidates]
    .sort(
      (a, b) =>
        taste(b) - taste(a) ||
        (b.playCount || 0) - (a.playCount || 0) ||
        a.id.localeCompare(b.id),
    )
    .map((s) => s.id);
  const fallback = (reason) => ({
    keys: diversify(baseline, byId, limit).map((id) => `song:${id}`),
    fallbackReason: reason,
  });
  if (!enabled) return fallback("disabled");
  if (available.length > 1000) return fallback("capacity");
  if (!candidates.length) return fallback("index_empty");
  try {
    const vectors = await readVectors(available),
      reference = vectors.get(source.id);
    if (!reference) return fallback("index_empty");
    const semantic = candidates
      .flatMap((s) => {
        const v = vectors.get(s.id);
        return v
          ? [
              {
                id: s.id,
                score: v.reduce(
                  (sum, value, i) => sum + value * reference[i],
                  0,
                ),
              },
            ]
          : [];
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (!semantic.length) return fallback("index_empty");
    const scores = new Map();
    [baseline, semantic.map((s) => s.id)].forEach((list) =>
      list.forEach((id, i) =>
        scores.set(id, (scores.get(id) || 0) + 1 / (60 + i)),
      ),
    );
    const merged = [...scores]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id]) => id);
    return {
      keys: diversify(merged, byId, limit).map((id) => `song:${id}`),
      fallbackReason: null,
    };
  } catch {
    return fallback("unavailable");
  }
}
async function personalizeSuggestions({
  catalog,
  baseline,
  history,
  favorites,
  following,
  readVectors,
  enabled,
  limit = 20,
}) {
  const available = catalog.filter(
    (s) => s.active === true && s.isPublic === true,
  );
  const byId = new Map(available.map((s) => [s.id, s]));
  const fallback = (reason) => ({
    keys: baseline
      .filter((s) => byId.has(s.id))
      .slice(0, limit)
      .map((s) => `song:${s.id}`),
    fallbackReason: reason,
  });
  if (!enabled) return fallback("disabled");
  if (available.length > 1000) return fallback("capacity");
  const favoriteSet = new Set(favorites),
    heard = new Set(history.map((h) => h.songId)),
    followSet = new Set(following);
  const weights = new Map();
  for (const id of favorites) if (byId.has(id)) weights.set(id, 3);
  history.slice(0, 100).forEach((entry, i) => {
    if (!byId.has(entry.songId)) return;
    const seconds = Number.isFinite(entry.listenedSeconds)
      ? Math.max(0, entry.listenedSeconds)
      : 0;
    const duration = Number.isFinite(entry.durationSeconds)
      ? Math.max(1, entry.durationSeconds)
      : 1;
    const weight =
      (entry.completed ? 3 : Math.min(2, seconds / duration)) / (1 + i / 10);
    if (weight > 0)
      weights.set(entry.songId, (weights.get(entry.songId) || 0) + weight);
  });
  if (!weights.size) return fallback("no_preferences");
  try {
    const vectors = await readVectors(available);
    let profile;
    for (const [id, weight] of weights) {
      const v = vectors.get(id);
      if (!v) continue;
      profile ||= Array(v.length).fill(0);
      v.forEach((value, i) => {
        profile[i] += value * weight;
      });
    }
    const norm = profile ? Math.hypot(...profile) : 0;
    if (!norm) return fallback("index_empty");
    const candidates = available.filter(
      (s) => !heard.has(s.id) && !favoriteSet.has(s.id),
    );
    const semantic = candidates
      .flatMap((s) => {
        const v = vectors.get(s.id);
        return v
          ? [
              {
                id: s.id,
                score: v.reduce(
                  (sum, value, i) => sum + (value * profile[i]) / norm,
                  0,
                ),
              },
            ]
          : [];
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (!semantic.length) return fallback("index_empty");
    const scores = new Map();
    // Preserve the existing metadata recommendation order as a strong signal.
    [
      baseline
        .filter((s) => candidates.some((c) => c.id === s.id))
        .map((s) => s.id),
      semantic.map((s) => s.id),
    ].forEach((list) =>
      list.forEach((id, i) =>
        scores.set(id, (scores.get(id) || 0) + 1 / (60 + i)),
      ),
    );
    for (const song of candidates)
      if (followSet.has(song.artistId) && scores.has(song.id))
        scores.set(song.id, scores.get(song.id) + 0.002);
    const related = [...scores]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id]) => id);
    const familiar = baseline
      .filter((s) => heard.has(s.id) || favoriteSet.has(s.id))
      .slice(0, 6)
      .map((s) => s.id);
    const selected = [...familiar, ...related.slice(0, 8)];
    const used = new Set(selected);
    // Keep space for discovery instead of replacing the whole rail with similarity.
    selected.push(
      ...baseline
        .filter(
          (s) => !used.has(s.id) && !heard.has(s.id) && !favoriteSet.has(s.id),
        )
        .slice(0, 6)
        .map((s) => s.id),
    );
    selected.push(...baseline.map((s) => s.id), ...related);
    return {
      keys: diversify(
        [...new Set(selected)].filter((id) => byId.has(id)),
        byId,
        limit,
      ).map((id) => `song:${id}`),
      fallbackReason: null,
    };
  } catch {
    return fallback("unavailable");
  }
}
module.exports = { recommendSimilar, personalizeSuggestions };
