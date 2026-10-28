import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { watchSongs, watchArtists } from "../services/catalogService";
import {
  watchPlaylists,
  watchFavorites,
  watchFollowing,
} from "../services/libraryService";
import { Artist, Playlist, Song } from "../types/domain";
import { errorMessage } from "../utils/feedback";
type Data = {
  songs: Song[];
  artists: Artist[];
  playlists: Playlist[];
  favoriteIds: string[];
  followingIds: string[];
  loading: boolean;
  errors: string[];
};
const Context = createContext<Data | null>(null);
export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return (
    <DataSession key={user?.uid ?? "guest"} uid={user?.uid}>
      {children}
    </DataSession>
  );
}
function DataSession({
  children,
  uid,
}: {
  children: React.ReactNode;
  uid?: string;
}) {
  const [songs, setSongs] = useState<Song[]>([]),
    [artists, setArtists] = useState<Artist[]>([]),
    [playlists, setPlaylists] = useState<Playlist[]>([]),
    [favoriteIds, setFavorites] = useState<string[]>([]),
    [followingIds, setFollowing] = useState<string[]>([]),
    [loading, setLoading] = useState(!!uid),
    [errors, setErrors] = useState<string[]>([]);
  useEffect(() => {
    let live = true;
    if (!uid) return;
    const fail = (name: string) => (e: Error) => {
      if (live) {
        setErrors((v) => [
          ...v.filter((x) => !x.startsWith(name + ":")),
          name + ": " + errorMessage(e),
        ]);
        if (name === "Songs") setLoading(false);
      }
    };
    const stops = [
      watchSongs((v) => {
        if (live) {
          setSongs(v);
          setLoading(false);
        }
      }, fail("Songs")),
      watchArtists((v) => {
        if (live) setArtists(v);
      }, fail("Artists")),
      watchPlaylists(
        uid,
        (v) => {
          if (live) setPlaylists(v);
        },
        fail("Playlist"),
      ),
      watchFavorites(
        uid,
        (v) => {
          if (live) setFavorites(v);
        },
        fail("Favorites"),
      ),
      watchFollowing(
        uid,
        (v) => {
          if (live) setFollowing(v);
        },
        fail("Following"),
      ),
    ];
    return () => {
      live = false;
      stops.forEach((stop) => stop());
    };
  }, [uid]);
  return (
    <Context.Provider
      value={{
        songs: songs.map((song) => ({
          ...song,
          artist:
            artists.find((a) => a.id === song.artistId)?.name ?? song.artist,
        })),
        artists,
        playlists,
        favoriteIds,
        followingIds,
        loading,
        errors,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useData() {
  const c = useContext(Context);
  if (!c) throw new Error("Thiếu DataProvider");
  return c;
}
