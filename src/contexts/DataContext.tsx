// import React, { createContext, useContext, useEffect, useState } from "react";
// import { useAuth } from "./AuthContext";
// import { watchSongs, watchArtists } from "../services/catalogService";
// import {
//   watchPlaylists,
//   watchFavorites,
//   watchFollowing,
// } from "../services/libraryService";
// import { Artist, Playlist, Song } from "../types/domain";
// import { errorMessage } from "../utils/feedback";
// type Data = {
//   songs: Song[];
//   artists: Artist[];
//   playlists: Playlist[];
//   favoriteIds: string[];
//   followingIds: string[];
//   loading: boolean;
//   errors: string[];
// };
// const Context = createContext<Data | null>(null);
// export function DataProvider({ children }: { children: React.ReactNode }) {
//   const { user } = useAuth();
//   return (
//     <DataSession key={user?.uid ?? "guest"} uid={user?.uid}>
//       {children}
//     </DataSession>
//   );
// }
// function DataSession({
//   children,
//   uid,
// }: {
//   children: React.ReactNode;
//   uid?: string;
// }) {
//   const [songs, setSongs] = useState<Song[]>([]),
//     [artists, setArtists] = useState<Artist[]>([]),
//     [playlists, setPlaylists] = useState<Playlist[]>([]),
//     [favoriteIds, setFavorites] = useState<string[]>([]),
//     [followingIds, setFollowing] = useState<string[]>([]),
//     [loading, setLoading] = useState(!!uid),
//     [errors, setErrors] = useState<string[]>([]);
//   useEffect(() => {
//     let live = true;
//     if (!uid) return;
//     const fail = (name: string) => (e: Error) => {
//       if (live) {
//         setErrors((v) => [
//           ...v.filter((x) => !x.startsWith(name + ":")),
//           name + ": " + errorMessage(e),
//         ]);
//         if (name === "Songs") setLoading(false);
//       }
//     };
//     const stops = [
//       watchSongs((v) => {
//         if (live) {
//           setSongs(v);
//           setLoading(false);
//         }
//       }, fail("Songs")),
//       watchArtists((v) => {
//         if (live) setArtists(v);
//       }, fail("Artists")),
//       watchPlaylists(
//         uid,
//         (v) => {
//           if (live) setPlaylists(v);
//         },
//         fail("Playlist"),
//       ),
//       watchFavorites(
//         uid,
//         (v) => {
//           if (live) setFavorites(v);
//         },
//         fail("Favorites"),
//       ),
//       watchFollowing(
//         uid,
//         (v) => {
//           if (live) setFollowing(v);
//         },
//         fail("Following"),
//       ),
//     ];
//     return () => {
//       live = false;
//       stops.forEach((stop) => stop());
//     };
//   }, [uid]);
//   return (
//     <Context.Provider
//       value={{
//         songs: songs.map((song) => ({
//           ...song,
//           artist:
//             artists.find((a) => a.id === song.artistId)?.name ?? song.artist,
//         })),
//         artists,
//         playlists,
//         favoriteIds,
//         followingIds,
//         loading,
//         errors,
//       }}
//     >
//       {children}
//     </Context.Provider>
//   );
// }
// export function useData() {
//   const c = useContext(Context);
//   if (!c) throw new Error("Thiếu DataProvider");
//   return c;
// }


//Update 10/30/2026
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { doc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from "../services/firebase";
import { useAuth } from "./AuthContext";

import {
  watchSongs,
  watchArtists,
  watchAlbums,
  getReadableSong,
  mapSong,
  watchFollowedSongs,
} from "../services/catalogService";

import {
  watchPlaylists,
  watchFavorites,
  watchFollowing,
  watchHistory,
} from "../services/libraryService";

import {
  Artist,
  Album,
  HistoryEntry,
  Playlist,
  Song,
} from "../types/domain";

import { errorMessage } from "../utils/feedback";

type Data = {
  songs: Song[];
  albums: Album[];
  history: HistoryEntry[];
  ensureSong: (id: string) => Promise<void>;
  artists: Artist[];
  playlists: Playlist[];
  favoriteIds: string[];
  followingIds: string[];
  loading: boolean;
  errors: string[];
};

const Context = createContext<Data | null>(null);

export function DataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    user,
    isAdmin,
    loading: authLoading,
  } = useAuth();

  return (
    <DataSession
      key={`${user?.uid ?? "guest"}-${isAdmin}`}
      uid={authLoading ? undefined : user?.uid}
      isAdmin={isAdmin}
    >
      {children}
    </DataSession>
  );
}

function DataSession({
  children,
  uid,
  isAdmin,
}: {
  children: React.ReactNode;
  uid?: string;
  isAdmin: boolean;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [followedSongs, setFollowedSongs] = useState<Song[]>([]);
  const [extraSongs, setExtraSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteIds, setFavorites] = useState<string[]>([]);
  const [followingIds, setFollowing] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!uid);
  const [errors, setErrors] = useState<string[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);

  const ensureSong = useCallback(async (id: string) => {
    const song = await getReadableSong(id);

    if (!song) {
      throw new Error("Bài hát không tồn tại.");
    }

    setRequestedIds(v =>
      v.includes(id) ? v : [...v, id],
    );

    setExtraSongs(v => [
      ...v.filter(s => s.id !== id),
      song,
    ]);
  }, []);

  const followingKey = JSON.stringify(
    [...followingIds].sort(),
  );

  useEffect(() => {
    if (!uid) return;

    return watchFollowedSongs(
      JSON.parse(followingKey),
      setFollowedSongs,
      e =>
        setErrors(v => [
          ...v.filter(x => !x.startsWith("Following songs:")),
          "Following songs: " + errorMessage(e),
        ]),
    );
  }, [uid, followingKey]);

  const linkedIds = JSON.stringify(
    [
      ...new Set([
        ...requestedIds,
        ...favoriteIds,
        ...playlists.flatMap(p => p.songIds),
      ]),
    ].sort(),
  );

  useEffect(() => {
    if (!uid) return;

    const ids = JSON.parse(linkedIds) as string[];

    const stops = ids.map(id =>
      onSnapshot(
        doc(getFirebaseDb(), "songs", id),
        snap => {
          setExtraSongs(v => [
            ...v.filter(s => s.id !== id),
            ...(snap.exists()
              ? [mapSong(snap.id, snap.data())]
              : []),
          ]);
        },
        () =>
          setExtraSongs(v =>
            v.filter(s => s.id !== id),
          ),
      ),
    );

    return () => stops.forEach(stop => stop());
  }, [uid, linkedIds]);

  useEffect(() => {
    let live = true;

    if (!uid) return;

    const fail = (name: string) => (e: Error) => {
      if (!live) return;

      setErrors(v => [
        ...v.filter(x => !x.startsWith(name + ":")),
        name + ": " + errorMessage(e),
      ]);

      if (name === "Songs") {
        setLoading(false);
      }
    };

    const stops = [
      watchSongs(
        v => {
          if (live) {
            setSongs(v);
            setLoading(false);
          }
        },
        fail("Songs"),
        isAdmin,
      ),

      watchAlbums(v => {
        if (live) setAlbums(v);
      }, fail("Albums")),

      watchHistory(
        uid,
        v => {
          if (live) setHistory(v);
        },
        fail("History"),
      ),

      watchArtists(v => {
        if (live) setArtists(v);
      }, fail("Artists")),

      watchPlaylists(
        uid,
        v => {
          if (live) setPlaylists(v);
        },
        fail("Playlist"),
      ),

      watchFavorites(
        uid,
        v => {
          if (live) setFavorites(v);
        },
        fail("Favorites"),
      ),

      watchFollowing(
        uid,
        v => {
          if (live) setFollowing(v);
        },
        fail("Following"),
      ),
    ];

    return () => {
      live = false;
      stops.forEach(stop => stop());
    };
  }, [uid, isAdmin]);

  const mergedSongs = [
    ...new Map(
      [...extraSongs, ...followedSongs, ...songs].map(
        song => [song.id, song],
      ),
    ).values(),
  ].map(song => ({
    ...song,
    artist:
      artists.find(a => a.id === song.artistId)?.name ??
      song.artist,
    album:
      albums.find(a => a.id === song.albumId)?.title ??
      song.album,
  }));

  return (
    <Context.Provider
      value={{
        songs: mergedSongs,
        albums,
        history,
        ensureSong,
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
  const value = useContext(Context);

  if (!value) throw new Error("Thiếu DataProvider");

  return value;
}
