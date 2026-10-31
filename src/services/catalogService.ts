// import {
//   collection,
//   doc,
//   addDoc,
//   updateDoc,
//   deleteDoc,
//   getDoc,
//   limit,
//   onSnapshot,
//   query,
// } from "firebase/firestore";
// import { getFirebaseDb } from "./firebase";
// import { Artist, Song, SongInput } from "../types/domain";
// import { cleanText, httpsUrl } from "../utils/validation";
// export function watchSongs(
//   next: (songs: Song[]) => void,
//   fail: (e: Error) => void,
// ) {
//   return onSnapshot(
//     query(collection(getFirebaseDb(), "songs"), limit(200)),
//     (snap) =>
//       next(
//         snap.docs.map((d) => {
//           const x = d.data();
//           return {
//             id: d.id,
//             title: String(x.title ?? ""),
//             artist: String(x.artist ?? ""),
//             artistId: String(x.artistId ?? ""),
//             album: String(x.album ?? ""),
//             cover: String(x.coverUrl ?? x.cover ?? ""),
//             audioUrl: String(x.audioUrl ?? ""),
//             audioKey: String(x.audioKey ?? ""),
//             durationSeconds: Number(x.durationSeconds ?? 0),
//             lyrics: String(x.lyrics ?? ""),
//             active: x.active !== false,
//           };
//         }),
//       ),
//     fail,
//   );
// }
// export function watchArtists(
//   next: (artists: Artist[]) => void,
//   fail: (e: Error) => void,
// ) {
//   return onSnapshot(
//     query(collection(getFirebaseDb(), "artists"), limit(100)),
//     (snap) =>
//       next(
//         snap.docs.map((d) => {
//           const x = d.data();
//           return {
//             id: d.id,
//             name: String(x.name ?? ""),
//             imageUrl: String(x.imageUrl ?? ""),
//             biography: String(x.biography ?? ""),
//             active: x.active !== false,
//           };
//         }),
//       ),
//     fail,
//   );
// }
// async function validateSong(v: SongInput) {
//   const data = {
//     title: cleanText(v.title, "tên bài hát", 150),
//     artist: cleanText(v.artist, "nghệ sĩ", 150),
//     artistId: v.artistId.trim(),
//     album: cleanText(v.album, "album", 150, false),
//     coverUrl: httpsUrl(v.coverUrl, "ảnh bìa"),
//     audioUrl: httpsUrl(v.audioUrl, "âm thanh"),
//     audioKey: v.audioKey || "",
//     durationSeconds: Number(v.durationSeconds),
//     lyrics: cleanText(v.lyrics, "lời bài hát", 12000, false),
//     active: v.active,
//   };
//   if (
//     !Number.isFinite(data.durationSeconds) ||
//     data.durationSeconds < 0 ||
//     data.durationSeconds > 86400
//   )
//     throw new Error("Thời lượng từ 0 đến 86400 giây.");
//   if (!["", "demo1", "demo2", "demo3"].includes(data.audioKey))
//     throw new Error("audioKey chỉ nhận demo1, demo2, demo3 hoặc để trống.");
//   if (!data.audioUrl && !["demo1", "demo2", "demo3"].includes(data.audioKey))
//     throw new Error("Nhập URL nhạc hoặc chọn audioKey demo1/demo2/demo3.");
//   if (data.artistId) {
//     const a = await getDoc(doc(getFirebaseDb(), "artists", data.artistId));
//     if (!a.exists()) throw new Error("Không tìm thấy artistId.");
//     data.artist = String(a.data().name);
//   }
//   return data;
// }
// export async function saveSong(id: string | null, value: SongInput) {
//   const v = await validateSong(value);
//   return id
//     ? updateDoc(doc(getFirebaseDb(), "songs", id), v)
//     : addDoc(collection(getFirebaseDb(), "songs"), v);
// }
// // Soft delete keeps playlist references valid. Admin can reactivate it later.
// export function archiveSong(id: string) {
//   return updateDoc(doc(getFirebaseDb(), "songs", id), { active: false });
// }
// export async function saveArtist(id: string | null, v: Omit<Artist, "id">) {
//   const data = {
//     name: cleanText(v.name, "tên nghệ sĩ", 150),
//     imageUrl: httpsUrl(v.imageUrl, "ảnh nghệ sĩ"),
//     biography: cleanText(v.biography, "giới thiệu", 4000, false),
//     active: v.active,
//   };
//   return id
//     ? updateDoc(doc(getFirebaseDb(), "artists", id), data)
//     : addDoc(collection(getFirebaseDb(), "artists"), data);
// }
// export function archiveArtist(id: string) {
//   return updateDoc(doc(getFirebaseDb(), "artists", id), { active: false });
// }
// export function deleteSongPermanently(id: string) {
//   return deleteDoc(doc(getFirebaseDb(), "songs", id));
// }

//Update Date 10/30/2026
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { getFirebaseAuth, getFirebaseDb } from "./firebase";
import { Artist, Album, Song, SongInput } from "../types/domain";
import { cleanText, httpsUrl } from "../utils/validation";

export function mapSong(
  id: string,
  x: Record<string, unknown>,
): Song {
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

export function watchSongs(
  next: (v: Song[]) => void,
  fail: (e: Error) => void,
  includeAll = false,
) {
  const db = getFirebaseDb();
  const uid = getFirebaseAuth().currentUser?.uid;

  let publicSongs: Song[] = [];
  let ownSongs: Song[] = [];

  const emit = () =>
    next([
      ...new Map(
        [...publicSongs, ...ownSongs].map(s => [s.id, s]),
      ).values(),
    ]);

  const stops = [
    onSnapshot(
      includeAll
        ? query(collection(db, "songs"))
        : query(
            collection(db, "songs"),
            where("visibility", "==", "public"),
            where("isPublished", "==", true),
          ),
      snap => {
        publicSongs = snap.docs.map(d => mapSong(d.id, d.data()));
        emit();
      },
      fail,
    ),
  ];

  if (uid) {
    stops.push(
      onSnapshot(
        query(
          collection(db, "songs"),
          where("artistId", "==", uid),
        ),
        snap => {
          ownSongs = snap.docs.map(d => mapSong(d.id, d.data()));
          emit();
        },
        fail,
      ),
    );
  }

  return () => stops.forEach(stop => stop());
}

export function watchArtists(
  next: (v: Artist[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    collection(getFirebaseDb(), "users"),
    snap =>
      next(
        snap.docs.map(d => {
          const x = d.data();

          return {
            id: d.id,
            name: String(x.displayName ?? ""),
            imageUrl: String(x.avatarUrl ?? ""),
            biography: String(x.biography ?? ""),
            active: x.active !== false,
            followerCount: Number(x.followerCount ?? 0),
            followingCount: Number(x.followingCount ?? 0),
          };
        }),
      ),
    fail,
  );
}

export function watchAlbums(
  next: (v: Album[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirebaseDb(), "albums"),
      where("isPublished", "==", true),
    ),
    snap =>
      next(
        snap.docs.map(d => ({
          id: d.id,
          title: String(d.data().title ?? ""),
          artistId: String(d.data().artistId ?? ""),
          artistName: String(d.data().artistName ?? ""),
          coverUrl: String(d.data().coverUrl ?? ""),
          isPublished: true,
        })),
      ),
    fail,
  );
}

export async function getReadableSong(id: string) {
  const snap = await getDoc(
    doc(getFirebaseDb(), "songs", id),
  );

  return snap.exists() ? mapSong(snap.id, snap.data()) : null;
}

export async function saveSong(
  id: string | null,
  v: SongInput,
) {
  const auth = getFirebaseAuth().currentUser;

  if (!auth) throw new Error("Cần đăng nhập.");

  const db = getFirebaseDb();
  const ref = id
    ? doc(db, "songs", id)
    : doc(collection(db, "songs"));

  const artistId = v.artistId || auth.uid;
  const profile = await getDoc(
    doc(db, "users", artistId),
  );

  if (!profile.exists()) {
    throw new Error("Không tìm thấy hồ sơ nghệ sĩ.");
  }

  const visibility = v.visibility ?? "public";
  const duration = Number(v.durationSeconds);

  if (
    !Number.isFinite(duration) ||
    duration <= 0 ||
    duration > 86400
  ) {
    throw new Error(
      "Thời lượng phải lớn hơn 0, tối đa 86400 giây.",
    );
  }

  if (v.albumId) {
    const album = await getDoc(
      doc(db, "albums", v.albumId),
    );

    if (
      !album.exists() ||
      album.data().artistId !== artistId
    ) {
      throw new Error("Album không thuộc nghệ sĩ này.");
    }
  }

  const audioUrl = httpsUrl(v.audioUrl, "âm thanh");

  if (
    !audioUrl &&
    !["demo1", "demo2", "demo3"].includes(v.audioKey)
  ) {
    throw new Error("Chọn file âm thanh.");
  }

  const value = {
    title: cleanText(v.title, "tên bài hát", 150),
    artistId,
    artistNames: [String(profile.data().displayName)],
    albumId: v.albumId ?? "",
    albumTitle: v.album.trim(),
    coverUrl: httpsUrl(v.coverUrl, "ảnh bìa"),
    audioUrl,
    audioKey: v.audioKey || "",
    durationSeconds: duration,
    genre: [
      ...new Set(
        (v.genre ?? ["Other"])
          .map(g => g.trim())
          .filter(Boolean),
      ),
    ],
    lyric: cleanText(v.lyrics, "lời bài hát", 12000, false),
    description: cleanText(
      v.description ?? "",
      "mô tả",
      4000,
      false,
    ),
    tags: v.tags ?? [],
    visibility,
    isPublished: visibility === "public" && v.active,
    active: v.active,
    updatedAt: serverTimestamp(),
  };

  if (id) {
    await updateDoc(ref, value);
  } else {
    await setDoc(ref, {
      ...value,
      songId: ref.id,
      playCount: 0,
      createdAt: serverTimestamp(),
      releaseDate: serverTimestamp(),
    });
  }

  return ref.id;
}

export function archiveSong(id: string) {
  return updateDoc(doc(getFirebaseDb(), "songs", id), {
    active: false,
    isPublished: false,
    updatedAt: serverTimestamp(),
  });
}

export function deleteSongPermanently(id: string) {
  return deleteDoc(doc(getFirebaseDb(), "songs", id));
}

export async function saveArtist(
  id: string | null,
  v: Omit<Artist, "id">,
) {
  if (!id) {
    throw new Error(
      "Nghệ sĩ mới phải đăng ký tài khoản. Không tạo user Auth bằng client admin form.",
    );
  }

  const db = getFirebaseDb();
  const batch = writeBatch(db);

  const fields = {
    displayName: cleanText(v.name, "tên", 80),
    avatarUrl: httpsUrl(v.imageUrl, "ảnh"),
    biography: cleanText(v.biography, "giới thiệu", 4000, false),
    active: v.active,
    updatedAt: serverTimestamp(),
  };

  batch.update(doc(db, "users", id), fields);

  await batch.commit();
}

export function archiveArtist(id: string) {
  return saveArtistActive(id);
}

async function saveArtistActive(id: string) {
  const db = getFirebaseDb();
  const batch = writeBatch(db);

  for (const c of ["users"]) {
    batch.update(doc(db, c, id), {
      active: false,
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

export async function createAlbum(
  title: string,
  coverUrl = "",
) {
  const user = getFirebaseAuth().currentUser;

  if (!user) throw new Error("Cần đăng nhập.");

  const ref = doc(
    collection(getFirebaseDb(), "albums"),
  );

  await setDoc(ref, {
    albumId: ref.id,
    title: cleanText(title, "album", 150),
    artistId: user.uid,
    artistName: user.displayName || "Người dùng",
    coverUrl: httpsUrl(coverUrl, "ảnh"),
    releaseDate: serverTimestamp(),
    isPublished: true,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export function watchFollowedSongs(
  ids: string[],
  next: (songs: Song[]) => void,
  fail: (e: Error) => void,
) {
  let live = true;

  const groups = new Map<string, Song[]>();

  const emit = () => {
    if (live) next([...groups.values()].flat());
  };

  queueMicrotask(emit);

  const stops = ids.map(id =>
    onSnapshot(
      query(
        collection(getFirebaseDb(), "songs"),
        where("artistId", "==", id),
        where("visibility", "==", "followers"),
        where("active", "==", true),
      ),
      snap => {
        groups.set(
          id,
          snap.docs.map(d => mapSong(d.id, d.data())),
        );

        emit();
      },
      e => {
        groups.delete(id);
        emit();

        if (live) fail(e);
      },
    ),
  );

  return () => {
    live = false;
    stops.forEach(stop => stop());
  };
}
