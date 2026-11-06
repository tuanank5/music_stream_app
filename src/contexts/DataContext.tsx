import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  getReadableSong,
  watchSongs,
  watchArtists,
  watchAlbums,
  watchSong,
  watchFollowedArtistSongs,
} from "../services/catalogService";
import {
  watchPlaylists,
  watchFavorites,
  watchFollowing,
  watchHistory,
} from "../services/libraryService";
import type {
  Album,
  Artist,
  HistoryEntry,
  Playlist,
  Song,
} from "../types/domain";
import { errorMessage } from "../utils/feedback";
import { mergeCatalogSongs } from "../utils/catalog";
import {
  createKeyedSubscriptions,
  createPendingRequests,
} from "../utils/subscriptions";

type CatalogData = {
  songs: Song[];
  albums: Album[];
  artists: Artist[];
  ensureSong: (id: string) => Promise<void>;
  loading: boolean;
  loadingSources: { songs: boolean; albums: boolean; artists: boolean };
  errors: string[];
};
type LibraryData = {
  playlists: Playlist[];
  favoriteIds: string[];
  followingIds: string[];
  loading: boolean;
};
type HistoryData = { history: HistoryEntry[]; loading: boolean; error: string };
const CatalogContext = createContext<CatalogData | null>(null);
const LibraryContext = createContext<LibraryData | null>(null);
const HistoryContext = createContext<HistoryData | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const uid = loading ? undefined : user?.uid;
  return (
    <DataSession key={uid ?? "guest"} uid={uid}>
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
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [favoriteIds, setFavorites] = useState<string[]>([]);
  const [followingIds, setFollowing] = useState<string[]>([]);
  const [followedSongs, setFollowedSongs] = useState<Song[]>([]);
  const [extraSongs, setExtraSongs] = useState<Song[]>([]);
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [ready, setReady] = useState({
    songs: !uid,
    artists: !uid,
    albums: !uid,
    history: !uid,
    playlists: !uid,
    favorites: !uid,
    following: !uid,
  });
  const live = useRef(true);
  const [pending] = useState(() => createPendingRequests<Song>());
  const sharedSongs = useMemo(
    () => [...songs, ...followedSongs],
    [songs, followedSongs],
  );
  const sharedIndex = useMemo(
    () => new Map(sharedSongs.map((song) => [song.id, song])),
    [sharedSongs],
  );
  const shared = useRef(sharedIndex);
  useEffect(() => {
    shared.current = sharedIndex;
  }, [sharedIndex]);

  const clearError = useCallback((source: string) => {
    setErrors((previous) =>
      previous.some((item) => item.startsWith(source + ": "))
        ? previous.filter((item) => !item.startsWith(source + ": "))
        : previous,
    );
  }, []);
  const fail = useCallback((source: string, error: Error) => {
    const message = source + ": " + errorMessage(error);
    setErrors((previous) =>
      previous.includes(message)
        ? previous
        : [
            ...previous.filter((item) => !item.startsWith(source + ": ")),
            message,
          ],
    );
  }, []);

  const [followingSubscriptions] = useState(() =>
    createKeyedSubscriptions<Song[]>(
      watchFollowedArtistSongs,
      (groups) => setFollowedSongs([...groups.values()].flat()),
      (id, error) => fail(`Following songs:${id}`, error),
      (id) => clearError(`Following songs:${id}`),
    ),
  );
  const [linkedSubscriptions] = useState(() =>
    createKeyedSubscriptions<Song | null>(
      watchSong,
      (items, waiting) =>
        setExtraSongs((previous) => [
          ...previous.filter((song) => waiting.has(song.id)),
          ...[...items.values()].filter((song): song is Song => song !== null),
        ]),
      (id, error) => {
        pending.invalidate(id);
        fail(`Song:${id}`, error);
      },
      (id, song) => {
        if (!song) pending.invalidate(id);
        clearError(`Song:${id}`);
      },
    ),
  );
  const ensureSong = useCallback(
    async (id: string) => {
      if (!uid || !live.current) throw new Error("Cần đăng nhập.");
      if (!id) throw new Error("Thiếu ID bài hát.");
      // Reuse only documents maintained by an active shared query. Detail requests
      // have no TTL permission cache: subsequent calls revalidate on the server.
      if (shared.current.has(id)) return;
      await pending.run(
        id,
        async () => {
          const song = await getReadableSong(id);
          if (!song) throw new Error("Bài hát không tồn tại.");
          return song;
        },
        (song) => {
          if (!live.current) return;
          setRequestedIds((previous) =>
            previous.includes(id) ? previous : [...previous, id],
          );
          setExtraSongs((previous) => [
            ...previous.filter((item) => item.id !== id),
            song,
          ]);
          linkedSubscriptions.retry(id);
        },
      );
    },
    [uid, pending, linkedSubscriptions],
  );

  const followingKey = JSON.stringify([...new Set(followingIds)].sort());
  const linkedKey = JSON.stringify(
    [
      ...new Set([
        ...requestedIds,
        ...favoriteIds,
        ...playlists.flatMap((playlist) => playlist.songIds),
      ]),
    ]
      .filter((id) => !sharedIndex.has(id))
      .sort(),
  );

  useEffect(() => {
    live.current = true;
    if (!uid)
      return () => {
        live.current = false;
        pending.clear();
      };
    const success =
      <T,>(
        source: keyof typeof ready,
        label: string,
        set: (value: T) => void,
      ) =>
      (value: T) => {
        if (!live.current) return;
        set(value);
        clearError(label);
        setReady((previous) =>
          previous[source] ? previous : { ...previous, [source]: true },
        );
      };
    const failure =
      (source: keyof typeof ready, label: string) => (error: Error) => {
        fail(label, error);
        if (live.current)
          setReady((previous) =>
            previous[source] ? previous : { ...previous, [source]: true },
          );
      };
    // Each callback also has a generation guard so StrictMode restart cannot
    // revive callbacks from the previous effect when live becomes true again.
    let active = true;
    const guarded =
      <T,>(callback: (value: T) => void) =>
      (value: T) => {
        if (active) callback(value);
      };
    const stops = [
      watchSongs(
        guarded(success("songs", "Songs", setSongs)),
        guarded(failure("songs", "Songs")),
      ),
      watchArtists(
        guarded(success("artists", "Artists", setArtists)),
        guarded(failure("artists", "Artists")),
      ),
      watchAlbums(
        guarded(success("albums", "Albums", setAlbums)),
        guarded(failure("albums", "Albums")),
      ),
      watchHistory(
        uid,
        guarded(success("history", "History", setHistory)),
        guarded(failure("history", "History")),
      ),
      watchPlaylists(
        uid,
        guarded(success("playlists", "Playlist", setPlaylists)),
        guarded(failure("playlists", "Playlist")),
      ),
      watchFavorites(
        uid,
        guarded(success("favorites", "Favorites", setFavorites)),
        guarded(failure("favorites", "Favorites")),
      ),
      watchFollowing(
        uid,
        guarded(success("following", "Following", setFollowing)),
        guarded(failure("following", "Following")),
      ),
    ];
    return () => {
      active = false;
      live.current = false;
      pending.clear();
      followingSubscriptions.clear();
      linkedSubscriptions.clear();
      stops.forEach((stop) => stop());
    };
  }, [
    uid,
    clearError,
    fail,
    pending,
    followingSubscriptions,
    linkedSubscriptions,
  ]);
  useEffect(() => {
    if (!uid) return;
    const ids: string[] = JSON.parse(followingKey);
    followingSubscriptions.update(ids);
  }, [uid, followingKey, followingSubscriptions]);
  useEffect(() => {
    if (!uid) return;
    const ids: string[] = JSON.parse(linkedKey);
    linkedSubscriptions.update(ids);
  }, [uid, linkedKey, linkedSubscriptions]);

  const visibleErrors = useMemo(() => {
    if (!errors.length) return errors;
    const followed: string[] = JSON.parse(followingKey);
    const linked: string[] = JSON.parse(linkedKey);
    const filtered = errors.filter((message) => {
      if (message.startsWith("Following songs:"))
        return followed.some((id) =>
          message.startsWith(`Following songs:${id}: `),
        );
      if (message.startsWith("Song:"))
        return linked.some((id) => message.startsWith(`Song:${id}: `));
      return true;
    });
    return filtered.length === errors.length ? errors : filtered;
  }, [errors, followingKey, linkedKey]);

  const mergedSongs = useMemo(
    () =>
      mergeCatalogSongs([extraSongs, followedSongs, songs], artists, albums),
    [extraSongs, followedSongs, songs, artists, albums],
  );
  const loadingSources = useMemo(
    () => ({
      songs: !ready.songs,
      artists: !ready.artists,
      albums: !ready.albums,
    }),
    [ready.songs, ready.artists, ready.albums],
  );
  const loading =
    loadingSources.songs || loadingSources.artists || loadingSources.albums;
  const catalogValue = useMemo(
    () => ({
      songs: mergedSongs,
      albums,
      artists,
      ensureSong,
      loading,
      loadingSources,
      errors: visibleErrors,
    }),
    [
      mergedSongs,
      albums,
      artists,
      ensureSong,
      loading,
      loadingSources,
      visibleErrors,
    ],
  );
  const libraryLoading =
    !ready.playlists || !ready.favorites || !ready.following;
  const libraryValue = useMemo(
    () => ({ playlists, favoriteIds, followingIds, loading: libraryLoading }),
    [playlists, favoriteIds, followingIds, libraryLoading],
  );
  const historyError = errors
    .filter((item) => item.startsWith("History:"))
    .join("\n");
  const historyValue = useMemo(
    () => ({ history, loading: !ready.history, error: historyError }),
    [history, ready.history, historyError],
  );
  return (
    <CatalogContext.Provider value={catalogValue}>
      <LibraryContext.Provider value={libraryValue}>
        <HistoryContext.Provider value={historyValue}>
          {children}
        </HistoryContext.Provider>
      </LibraryContext.Provider>
    </CatalogContext.Provider>
  );
}

export function useCatalogData() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error("Thiếu DataProvider");
  return value;
}
export function useLibraryData() {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("Thiếu DataProvider");
  return value;
}
export function useHistoryData() {
  const value = useContext(HistoryContext);
  if (!value) throw new Error("Thiếu DataProvider");
  return value;
}
// Existing mixed screens keep this facade, without subscribing to playback
// history. Screens needing history must opt into useHistoryData explicitly.
export function useData() {
  const catalog = useCatalogData();
  const library = useLibraryData();
  return useMemo(
    () => ({
      ...catalog,
      ...library,
      loading: catalog.loading || library.loading,
    }),
    [catalog, library],
  );
}
