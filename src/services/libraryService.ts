import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { Playlist } from "../types/domain";
import { cleanText } from "../utils/validation";
export function watchPlaylists(
  uid: string,
  next: (p: Playlist[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(getFirebaseDb(), "users", uid, "playlists"), limit(100)),
    (s) =>
      next(
        s.docs.map((d) => ({
          id: d.id,
          name: String(d.data().name ?? ""),
          description: String(d.data().description ?? ""),
          songIds: Array.isArray(d.data().songIds)
            ? d.data().songIds.filter((x: unknown) => typeof x === "string")
            : [],
        })),
      ),
    fail,
  );
}
export function watchFavorites(
  uid: string,
  next: (ids: string[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(getFirebaseDb(), "users", uid, "favorites"), limit(500)),
    (s) => next(s.docs.map((d) => d.id)),
    fail,
  );
}
export async function savePlaylist(
  uid: string,
  id: string | null,
  name: string,
  description: string,
) {
  const data = {
    name: cleanText(name, "tên playlist", 80),
    description: cleanText(description, "mô tả", 500, false),
  };
  return id
    ? updateDoc(doc(getFirebaseDb(), "users", uid, "playlists", id), data)
    : addDoc(collection(getFirebaseDb(), "users", uid, "playlists"), {
        ...data,
        songIds: [],
      });
}
export function deletePlaylist(uid: string, id: string) {
  return deleteDoc(doc(getFirebaseDb(), "users", uid, "playlists", id));
}
export function changePlaylistSong(
  uid: string,
  id: string,
  songId: string,
  add: boolean,
) {
  return updateDoc(doc(getFirebaseDb(), "users", uid, "playlists", id), {
    songIds: add ? arrayUnion(songId) : arrayRemove(songId),
  });
}
export function setFavorite(uid: string, songId: string, value: boolean) {
  const ref = doc(getFirebaseDb(), "users", uid, "favorites", songId);
  return value ? setDoc(ref, { songId }) : deleteDoc(ref);
}
export function setFollow(uid: string, artistId: string, value: boolean) {
  const ref = doc(getFirebaseDb(), "users", uid, "following", artistId);
  return value ? setDoc(ref, { artistId }) : deleteDoc(ref);
}
export function watchFollowing(
  uid: string,
  next: (ids: string[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(getFirebaseDb(), "users", uid, "following"), limit(500)),
    (s) => next(s.docs.map((d) => d.id)),
    fail,
  );
}
