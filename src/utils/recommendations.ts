import type {
  Album,
  HistoryEntry,
  Song,
} from "../types/domain";

const publicSong = (song: Song) =>
  song.active &&
  song.isPublished &&
  song.visibility === "public";

const rank = (a: Song, b: Song) =>
  b.playCount - a.playCount ||
  a.id.localeCompare(b.id);

export function genreCharts(songs: Song[]) {
  const groups = new Map<string, Song[]>();

  for (const song of songs.filter(publicSong)) {
    const genres = new Set(
      song.genre.map(g => g.trim()).filter(Boolean),
    );

    for (const genre of genres) {
      groups.set(genre, [
        ...(groups.get(genre) ?? []),
        song,
      ]);
    }
  }

  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([genre, tracks], index) => ({
      id: `genre-${encodeURIComponent(genre)}`,
      title: "Top 50",
      subtitle: genre,
      description: `50 bài ${genre} có lượt nghe nhiều nhất`,
      coverUrl: "",
      theme: (
        ["violet", "cyan", "pink"] as const
      )[index % 3],
      active: true,
      order: index,
      songIds: [...tracks]
        .sort(rank)
        .slice(0, 50)
        .map(song => song.id),
    }));
}

export function trendingAlbums(
  songs: Song[],
  albums: Album[],
) {
  const groups = new Map<string, Song[]>();

  for (const song of songs.filter(publicSong)) {
    if (!song.albumId) continue;

    groups.set(song.albumId, [
      ...(groups.get(song.albumId) ?? []),
      song,
    ]);
  }

  return albums
    .filter(album =>
      album.isPublished && groups.has(album.id),
    )
    .map(album => {
      const tracks = groups.get(album.id)!;

      return {
        ...album,
        totalPlayCount: tracks.reduce(
          (total, song) => total + song.playCount,
          0,
        ),
        songs: tracks.sort(rank),
      };
    })
    .sort(
      (a, b) =>
        b.totalPlayCount - a.totalPlayCount ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 50);
}

export function suggestSongs(
  songs: Song[],
  history: HistoryEntry[],
  limit = 12,
) {
  const available = songs.filter(publicSong);

  const index = new Map(
    available.map(song => [song.id, song]),
  );

  const recent = new Map<string, number>();
  const weights = new Map<string, number>();

  history.slice(0, 100).forEach((entry, position) => {
    if (!recent.has(entry.songId)) {
      recent.set(entry.songId, 100 - position);
    }

    const song = index.get(entry.songId);

    if (song) {
      for (const genre of song.genre) {
        weights.set(
          genre,
          (weights.get(genre) ?? 0) + 100 - position,
        );
      }
    }
  });

  const heard = available
    .filter(song => recent.has(song.id))
    .sort(
      (a, b) =>
        recent.get(b.id)! - recent.get(a.id)!,
    );

  const related = available
    .filter(song => !recent.has(song.id))
    .sort((a, b) => {
      const score = (song: Song) =>
        song.genre.reduce(
          (total, genre) =>
            total + (weights.get(genre) ?? 0),
          0,
        );

      return score(b) - score(a) || rank(a, b);
    });

  const result = heard.slice(
    0,
    Math.ceil(limit / 2),
  );

  result.push(
    ...related.slice(0, limit - result.length),
  );

  const ids = new Set(result.map(song => song.id));

  result.push(
    ...heard
      .filter(song => !ids.has(song.id))
      .slice(0, limit - result.length),
  );

  return result;
}