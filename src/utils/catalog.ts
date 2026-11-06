import type { Album, Artist, Song } from "../types/domain";

export function mergeCatalogSongs(
  groups: readonly (readonly Song[])[],
  artists: readonly Artist[],
  albums: readonly Album[],
): Song[] {
  const artistIndex = new Map(
    artists.map((artist) => [artist.id, artist.name]),
  );
  const albumIndex = new Map(albums.map((album) => [album.id, album.title]));
  return [
    ...new Map(
      groups.flatMap((group) => group.map((song) => [song.id, song] as const)),
    ).values(),
  ].map((song) => {
    const artist = song.artistNames?.length
      ? song.artistNames.join(", ")
      : (artistIndex.get(song.artistId) ?? song.artist);
    const album =
      (song.albumId ? albumIndex.get(song.albumId) : undefined) ?? song.album;
    return artist === song.artist && album === song.album
      ? song
      : { ...song, artist, album };
  });
}
