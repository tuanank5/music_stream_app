import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  limit,
  onSnapshot,
  query,
} from "firebase/firestore";
import { getFirebaseDb } from "./firebase";
import { Artist, Song, SongInput } from "../types/domain";
import { cleanText, httpsUrl } from "../utils/validation";
export function watchSongs(
  next: (songs: Song[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(getFirebaseDb(), "songs"), limit(200)),
    (snap) =>
      next(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            title: String(x.title ?? ""),
            artist: String(x.artist ?? ""),
            artistId: String(x.artistId ?? ""),
            album: String(x.album ?? ""),
            cover: String(x.coverUrl ?? x.cover ?? ""),
            audioUrl: String(x.audioUrl ?? ""),
            audioKey: String(x.audioKey ?? ""),
            durationSeconds: Number(x.durationSeconds ?? 0),
            lyrics: String(x.lyrics ?? ""),
            active: x.active !== false,
          };
        }),
      ),
    fail,
  );
}
export function watchArtists(
  next: (artists: Artist[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(collection(getFirebaseDb(), "artists"), limit(100)),
    (snap) =>
      next(
        snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            name: String(x.name ?? ""),
            imageUrl: String(x.imageUrl ?? ""),
            biography: String(x.biography ?? ""),
            active: x.active !== false,
          };
        }),
      ),
    fail,
  );
}
async function validateSong(v: SongInput) {
  const data = {
    title: cleanText(v.title, "tên bài hát", 150),
    artist: cleanText(v.artist, "nghệ sĩ", 150),
    artistId: v.artistId.trim(),
    album: cleanText(v.album, "album", 150, false),
    coverUrl: httpsUrl(v.coverUrl, "ảnh bìa"),
    audioUrl: httpsUrl(v.audioUrl, "âm thanh"),
    audioKey: v.audioKey || "",
    durationSeconds: Number(v.durationSeconds),
    lyrics: cleanText(v.lyrics, "lời bài hát", 12000, false),
    active: v.active,
  };
  if (
    !Number.isFinite(data.durationSeconds) ||
    data.durationSeconds < 0 ||
    data.durationSeconds > 86400
  )
    throw new Error("Thời lượng từ 0 đến 86400 giây.");
  if (!["", "demo1", "demo2", "demo3"].includes(data.audioKey))
    throw new Error("audioKey chỉ nhận demo1, demo2, demo3 hoặc để trống.");
  if (!data.audioUrl && !["demo1", "demo2", "demo3"].includes(data.audioKey))
    throw new Error("Nhập URL nhạc hoặc chọn audioKey demo1/demo2/demo3.");
  if (data.artistId) {
    const a = await getDoc(doc(getFirebaseDb(), "artists", data.artistId));
    if (!a.exists()) throw new Error("Không tìm thấy artistId.");
    data.artist = String(a.data().name);
  }
  return data;
}
export async function saveSong(id: string | null, value: SongInput) {
  const v = await validateSong(value);
  return id
    ? updateDoc(doc(getFirebaseDb(), "songs", id), v)
    : addDoc(collection(getFirebaseDb(), "songs"), v);
}
// Soft delete keeps playlist references valid. Admin can reactivate it later.
export function archiveSong(id: string) {
  return updateDoc(doc(getFirebaseDb(), "songs", id), { active: false });
}
export async function saveArtist(id: string | null, v: Omit<Artist, "id">) {
  const data = {
    name: cleanText(v.name, "tên nghệ sĩ", 150),
    imageUrl: httpsUrl(v.imageUrl, "ảnh nghệ sĩ"),
    biography: cleanText(v.biography, "giới thiệu", 4000, false),
    active: v.active,
  };
  return id
    ? updateDoc(doc(getFirebaseDb(), "artists", id), data)
    : addDoc(collection(getFirebaseDb(), "artists"), data);
}
export function archiveArtist(id: string) {
  return updateDoc(doc(getFirebaseDb(), "artists", id), { active: false });
}
export function deleteSongPermanently(id: string) {
  return deleteDoc(doc(getFirebaseDb(), "songs", id));
}
