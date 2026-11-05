//Update Date 10/30/2026
import { collection, doc } from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { backendGet, backendPost } from "./backendService";
import { subscribePrivateList } from "./playlistSubscriptions";
import { Artist, Album, Song } from "../types/domain";
import { cleanText, httpsUrl } from "../utils/validation";

export function mapSong(id: string, x: Record<string, unknown>): Song {
  const names = Array.isArray(x.artistNames)
    ? x.artistNames.map(String)
    : [String(x.artist ?? "")];

  return {
    id,
    title: String(x.title ?? ""),
    artist: names.join(", "),
    artistNames: names,
    artistId: String(x.artistId ?? ""),
    albumId: String(x.albumId ?? ""),
    album: String(x.albumTitle ?? x.album ?? ""),
    cover: String(x.coverUrl ?? ""),
    audioUrl: String(x.audioUrl ?? ""),
    audioKey: String(x.audioKey ?? ""),
    durationSeconds: Number(x.durationSeconds ?? 0),
    lyrics: String(x.lyric ?? x.lyrics ?? ""),
    genre: Array.isArray(x.genre)
      ? x.genre.map(String)
      : typeof x.genre === "string"
        ? [x.genre]
        : [],
    playCount: Number(x.playCount ?? 0),
    visibility: (x.visibility ?? "public") as Song["visibility"],
    isPublished: x.isPublished === true,
    active: x.active !== false,
  };
}

function subscribeCatalog<T extends { id: string }>(
  path: string,
  next: (items: T[]) => void,
  fail: (error: Error) => void,
) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    let live = true;
    queueMicrotask(() => {
      if (live) next([]);
    });
    return () => {
      live = false;
    };
  }
  return subscribePrivateList<T>(uid, path, next, fail);
}
export function watchSongs(
  next: (items: Song[]) => void,
  fail: (error: Error) => void,
) {
  let seed: Song[] = [],
    own: Song[] = [];
  const emit = () =>
    next([
      ...new Map([...seed, ...own].map((song) => [song.id, song])).values(),
    ]);
  const stops = [
    subscribeCatalog<Song>(
      "/catalog/public-songs",
      (items) => {
        seed = items;
        emit();
      },
      fail,
    ),
    subscribeCatalog<Song>(
      "/catalog/own-songs",
      (items) => {
        own = items;
        emit();
      },
      fail,
    ),
  ];
  return () => stops.forEach((stop) => stop());
}
export function watchArtists(
  next: (items: Artist[]) => void,
  fail: (error: Error) => void,
) {
  return subscribeCatalog<Artist>("/catalog/artists", next, fail);
}
export function watchAlbums(
  next: (items: Album[]) => void,
  fail: (error: Error) => void,
) {
  return subscribeCatalog<Album>("/catalog/albums", next, fail);
}

export async function getReadableSong(id: string) {
  try {
    return await backendGet<Song>(`/songs/${encodeURIComponent(id)}`);
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 404) return null;
    if (status === 403)
      Object.assign(error as object, { code: "permission-denied" });
    throw error;
  }
}

export async function createAlbum(title: string, coverUrl = "") {
  const album = await backendPost<{ id: string }>("/albums", {
    title: cleanText(title, "album", 150),
    coverUrl: httpsUrl(coverUrl, "ảnh"),
    description: "",
    isPublic: true,
  });
  return album.id;
}
export function newSongId() {
  return doc(collection(getFirebaseDb(), "songs")).id;
}

export function watchArtistFollowerSongs(
  artistId: string,
  next: (items: Song[]) => void,
  fail: (error: Error) => void,
) {
  return subscribeCatalog<Song>(
    `/catalog/follower-songs/${encodeURIComponent(artistId)}`,
    next,
    fail,
  );
}

export function watchSong(
  id: string,
  next: (song: Song | null) => void,
  fail: (error: Error) => void,
) {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    queueMicrotask(() => fail(new Error("Cần đăng nhập.")));
    return () => {};
  }
  return subscribePrivateList<Song>(
    uid,
    `/song-items/${encodeURIComponent(id)}`,
    (items) => next(items[0] || null),
    fail,
  );
}
