import type { Artist, Song } from "../types/domain";
import type { MusicChart } from "../types/discovery";

// Lấy bài hát đang hoạt động của đúng nghệ sĩ.
export function artistSongs(
  songs: Song[],
  artistId: string,
): Song[] {
  return songs.filter(
    (song) =>
      song.active &&
      song.artistId === artistId,
  );
}

// Sắp xếp nghệ sĩ theo số bài đang hoạt động.
// Đây không phải thống kê lượt nghe.
// export function popularArtists(
//   artists: Artist[],
//   songs: Song[],
// ): Artist[] {
//   const counts = new Map<string, number>();

//   for (const song of songs) {
//     if (!song.active) continue;

//     counts.set(
//       song.artistId,
//       (counts.get(song.artistId) ?? 0) + 1,
//     );
//   }

//   return artists
//     .filter((artist) => artist.active)
//     .sort(
//       (a, b) =>
//         (counts.get(b.id) ?? 0) -
//           (counts.get(a.id) ?? 0) ||
//         a.name.localeCompare(b.name),
//     );
// }
export function popularArtists(
  artists: Artist[],
  songs: Song[],
): Artist[] {
  const count = new Map<string, number>();

  songs
    .filter(song => song.active)
    .forEach(song =>
      count.set(
        song.artistId,
        (count.get(song.artistId) ?? 0) + 1,
      ),
    );

  return artists
    .filter(artist => artist.active)
    .sort(
      (a, b) =>
        (b.followerCount ?? 0) -
          (a.followerCount ?? 0) ||
        (count.get(b.id) ?? 0) -
          (count.get(a.id) ?? 0) ||
        a.name.localeCompare(b.name),
    );
}

// Lấy bài theo đúng thứ tự songIds của chart.
export function chartSongs(
  songs: Song[],
  chart: Pick<MusicChart, "songIds">,
): Song[] {
  const index = new Map(
    songs
      .filter((song) => song.active)
      .map((song) => [song.id, song]),
  );

  return [...new Set(chart.songIds)].flatMap((id) => {
    const song = index.get(id);
    return song ? [song] : [];
  });
}

// Gom album từ danh sách bài của một nghệ sĩ.
export function artistAlbums(songs: Song[]) {
  const groups = new Map<string, Song[]>();

  for (const song of songs) {
    const name = song.album.trim();

    if (!name) continue;

    groups.set(name, [
      ...(groups.get(name) ?? []),
      song,
    ]);
  }

  return [...groups].map(([name, tracks]) => ({
    name,
    songs: tracks,
    cover:
      tracks.find((song) => song.cover)?.cover ?? "",
  }));
}

// Trộn bản sao, không thay đổi danh sách gốc.
export function shuffleSongs(
  songs: Song[],
  random: () => number = Math.random,
): Song[] {
  const result = [...songs];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));

    [result[i], result[j]] = [
      result[j],
      result[i],
    ];
  }

  return result;
}