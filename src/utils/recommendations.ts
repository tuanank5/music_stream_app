import type { Album, Artist, HistoryEntry, Song } from "../types/domain";
export const publicSong = (song: Song) =>
  song.active && song.isPublished && song.visibility === "public";
const rank = (a: Song, b: Song) =>
  b.playCount - a.playCount || a.id.localeCompare(b.id);
export function seedValue(value: string) {
  let hash = 2166136261;
  for (const char of value)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export function seeded<T extends { id: string }>(
  items: T[],
  seed: string,
): T[] {
  return [...items].sort(
    (a, b) =>
      seedValue(seed + a.id) - seedValue(seed + b.id) ||
      a.id.localeCompare(b.id),
  );
}
function diverse<T extends { id: string; artistId: string }>(
  items: T[],
  limit: number,
) {
  const result: T[] = [],
    pending = [...items];
  const counts = new Map<string, number>();
  while (pending.length && result.length < limit) {
    const previous = result.at(-1)?.artistId;
    let index = pending.findIndex(
      (item) =>
        item.artistId !== previous && (counts.get(item.artistId) ?? 0) < 2,
    );
    if (index < 0)
      index = pending.findIndex((item) => (counts.get(item.artistId) ?? 0) < 2);
    if (index < 0)
      index = pending.findIndex((item) => item.artistId !== previous);
    const selected = pending.splice(index < 0 ? 0 : index, 1)[0];
    result.push(selected);
    counts.set(selected.artistId, (counts.get(selected.artistId) ?? 0) + 1);
  }
  return result;
}
export function genreCharts(songs: Song[], seed = "default") {
  const groups = new Map<string, Song[]>();
  for (const song of songs.filter(publicSong))
    for (const genre of new Set(
      song.genre.map((g) => g.trim()).filter(Boolean),
    ))
      groups.set(genre, [...(groups.get(genre) ?? []), song]);
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([genre, tracks], index) => ({
      id: "genre-" + encodeURIComponent(genre),
      title: "Top 50",
      subtitle: genre,
      description: `Tuyển tập 50 bài ${genre} được nghe nhiều nhất.`,
      coverUrl: "",
      theme: (["violet", "cyan", "pink"] as const)[index % 3],
      active: true,
      order: index,
      songIds: seeded(
        [...new Map(tracks.map((song) => [song.id, song])).values()]
          .sort(rank)
          .slice(0, 50),
        seed + genre,
      ).map((song) => song.id),
    }));
}
export function trendingAlbums(songs: Song[], albums: Album[]) {
  const groups = new Map<string, Song[]>();
  for (const song of songs.filter(publicSong))
    if (song.albumId)
      groups.set(song.albumId, [...(groups.get(song.albumId) ?? []), song]);
  return albums
    .filter((album) => album.isPublished && groups.has(album.id))
    .map((album) => ({
      ...album,
      totalPlayCount: groups
        .get(album.id)!
        .reduce((sum, song) => sum + song.playCount, 0),
      songs: groups.get(album.id)!.sort(rank),
    }))
    .sort(
      (a, b) => b.totalPlayCount - a.totalPlayCount || a.id.localeCompare(b.id),
    );
}
export function homeAlbums(songs: Song[], albums: Album[], seed: string) {
  return diverse(seeded(trendingAlbums(songs, albums).slice(0, 60), seed), 20);
}
export function rankedArtists(artists: Artist[], songs: Song[], uid: string) {
  const eligible = new Set(
    songs.filter(publicSong).map((song) => song.artistId),
  );
  return artists
    .filter(
      (artist) => artist.active && artist.id !== uid && eligible.has(artist.id),
    )
    .sort(
      (a, b) =>
        (b.followerCount ?? 0) - (a.followerCount ?? 0) ||
        a.id.localeCompare(b.id),
    );
}
export function homeArtists(
  artists: Artist[],
  songs: Song[],
  uid: string,
  seed: string,
) {
  const pool = rankedArtists(artists, songs, uid).slice(0, 60);
  const groups = [pool.slice(0, 20), pool.slice(20, 40), pool.slice(40, 60)];
  const quotas = [10, 6, 4];
  const selected = groups.flatMap((group, index) =>
    seeded(group, seed + index).slice(0, quotas[index]),
  );
  const ids = new Set(selected.map((item) => item.id));
  selected.push(
    ...seeded(
      pool.filter((item) => !ids.has(item.id)),
      seed,
    ).slice(0, 20 - selected.length),
  );
  return seeded(selected, seed);
}
export function suggestSongs(
  songs: Song[],
  history: HistoryEntry[],
  limit = 20,
  favorites: string[] = [],
  following: string[] = [],
  seed = "default",
) {
  const available = [
    ...new Map(
      songs.filter(publicSong).map((song) => [song.id, song]),
    ).values(),
  ];
  const index = new Map(available.map((song) => [song.id, song]));
  const heardIds = new Set(history.map((item) => item.songId));
  const favoriteIds = new Set(favorites),
    followIds = new Set(following);
  const weights = new Map<string, number>();
  const weight = (song: Song, score: number) =>
    song.genre.forEach((genre) =>
      weights.set(genre, (weights.get(genre) ?? 0) + score),
    );
  history.slice(0, 100).forEach((entry, position) => {
    const song = index.get(entry.songId);
    if (song)
      weight(
        song,
        (entry.completed
          ? 3
          : Math.min(
              2,
              entry.listenedSeconds / Math.max(1, entry.durationSeconds),
            )) /
          (1 + position / 10),
      );
  });
  available
    .filter((song) => favoriteIds.has(song.id))
    .forEach((song) => weight(song, 3));
  const taste = (song: Song) =>
    song.genre.reduce((sum, genre) => sum + (weights.get(genre) ?? 0), 0) +
    (followIds.has(song.artistId) ? 3 : 0);
  const familiar = seeded(
    available.filter(
      (song) => heardIds.has(song.id) || favoriteIds.has(song.id),
    ),
    seed,
  );
  const related = available
    .filter((song) => !heardIds.has(song.id) && taste(song) > 0)
    .sort(
      (a, b) =>
        taste(b) - taste(a) || seedValue(seed + a.id) - seedValue(seed + b.id),
    );
  const discovery = seeded(
    available.filter(
      (song) => !heardIds.has(song.id) && !favoriteIds.has(song.id),
    ),
    seed + "new",
  );
  const chosen = [
    ...familiar.slice(0, 6),
    ...related.slice(0, 8),
    ...discovery.slice(0, 6),
    ...seeded(available, seed),
  ];
  return diverse(
    [...new Map(chosen.map((song) => [song.id, song])).values()],
    limit,
  );
}
