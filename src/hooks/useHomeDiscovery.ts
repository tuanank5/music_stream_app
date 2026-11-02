import { useMemo } from "react";
import { useCatalogData, useHistoryData } from "../contexts/DataContext";
import { popularArtists } from "../utils/discovery";
import { suggestSongs, trendingAlbums } from "../utils/recommendations";

// Derive Home content from the existing shared data session; no extra listeners.
export function useHomeDiscovery() {
  const data = useCatalogData();
  const { history } = useHistoryData();
  const songs = useMemo(
    () =>
      data.songs.filter(
        (song) =>
          song.active && song.isPublished && song.visibility === "public",
      ),
    [data.songs],
  );
  const suggestions = useMemo(
    () => suggestSongs(songs, history),
    [songs, history],
  );
  const albums = useMemo(
    () => trendingAlbums(songs, data.albums),
    [songs, data.albums],
  );
  const artists = useMemo(() => {
    const artistIds = new Set(songs.map((song) => song.artistId));
    return popularArtists(data.artists, data.songs).filter((artist) =>
      artistIds.has(artist.id),
    );
  }, [data.artists, data.songs, songs]);

  return {
    songs,
    suggestions,
    albums,
    artists,
    loading: data.loading,
    errors: data.errors,
  };
}
