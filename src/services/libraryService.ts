// import {
//   addDoc,
//   arrayRemove,
//   arrayUnion,
//   collection,
//   deleteDoc,
//   doc,
//   limit,
//   onSnapshot,
//   query,
//   setDoc,
//   updateDoc,
// } from "firebase/firestore";
// import { getFirebaseDb } from "./firebase";
// import { Playlist } from "../types/domain";
// import { cleanText } from "../utils/validation";
// export function watchPlaylists(
//   uid: string,
//   next: (p: Playlist[]) => void,
//   fail: (e: Error) => void,
// ) {
//   return onSnapshot(
//     query(collection(getFirebaseDb(), "users", uid, "playlists"), limit(100)),
//     (s) =>
//       next(
//         s.docs.map((d) => ({
//           id: d.id,
//           name: String(d.data().name ?? ""),
//           description: String(d.data().description ?? ""),
//           songIds: Array.isArray(d.data().songIds)
//             ? d.data().songIds.filter((x: unknown) => typeof x === "string")
//             : [],
//         })),
//       ),
//     fail,
//   );
// }
// export function watchFavorites(
//   uid: string,
//   next: (ids: string[]) => void,
//   fail: (e: Error) => void,
// ) {
//   return onSnapshot(
//     query(collection(getFirebaseDb(), "users", uid, "favorites"), limit(500)),
//     (s) => next(s.docs.map((d) => d.id)),
//     fail,
//   );
// }
// export async function savePlaylist(
//   uid: string,
//   id: string | null,
//   name: string,
//   description: string,
// ) {
//   const data = {
//     name: cleanText(name, "tên playlist", 80),
//     description: cleanText(description, "mô tả", 500, false),
//   };
//   return id
//     ? updateDoc(doc(getFirebaseDb(), "users", uid, "playlists", id), data)
//     : addDoc(collection(getFirebaseDb(), "users", uid, "playlists"), {
//         ...data,
//         songIds: [],
//       });
// }
// export function deletePlaylist(uid: string, id: string) {
//   return deleteDoc(doc(getFirebaseDb(), "users", uid, "playlists", id));
// }
// export function changePlaylistSong(
//   uid: string,
//   id: string,
//   songId: string,
//   add: boolean,
// ) {
//   return updateDoc(doc(getFirebaseDb(), "users", uid, "playlists", id), {
//     songIds: add ? arrayUnion(songId) : arrayRemove(songId),
//   });
// }
// export function setFavorite(uid: string, songId: string, value: boolean) {
//   const ref = doc(getFirebaseDb(), "users", uid, "favorites", songId);
//   return value ? setDoc(ref, { songId }) : deleteDoc(ref);
// }
// export function setFollow(uid: string, artistId: string, value: boolean) {
//   const ref = doc(getFirebaseDb(), "users", uid, "following", artistId);
//   return value ? setDoc(ref, { artistId }) : deleteDoc(ref);
// }
// export function watchFollowing(
//   uid: string,
//   next: (ids: string[]) => void,
//   fail: (e: Error) => void,
// ) {
//   return onSnapshot(
//     query(collection(getFirebaseDb(), "users", uid, "following"), limit(500)),
//     (s) => next(s.docs.map((d) => d.id)),
//     fail,
//   );
// }


//Update Date 10/30/2026
import {
  collection,
  deleteDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { getFirebaseDb } from "./firebase";
import { HistoryEntry, Playlist } from "../types/domain";
import { cleanText } from "../utils/validation";

export function watchPlaylists(
  uid: string,
  next: (p: Playlist[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    collection(getFirebaseDb(), "users", uid, "playlists"),
    snap =>
      next(
        snap.docs.map(d => ({
          id: d.id,
          name: String(d.data().name ?? ""),
          description: String(d.data().description ?? ""),
          songIds: Array.isArray(d.data().songIds)
            ? d.data().songIds
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
    collection(getFirebaseDb(), "users", uid, "favorites"),
    snap => next(snap.docs.map(d => d.id)),
    fail,
  );
}

export function watchFollowing(
  uid: string,
  next: (ids: string[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    collection(getFirebaseDb(), "users", uid, "following"),
    snap => next(snap.docs.map(d => d.id)),
    fail,
  );
}

export function watchHistory(
  uid: string,
  next: (v: HistoryEntry[]) => void,
  fail: (e: Error) => void,
) {
  return onSnapshot(
    query(
      collection(getFirebaseDb(), "users", uid, "history"),
      orderBy("playedAt", "desc"),
      limit(100),
    ),
    snap =>
      next(
        snap.docs.map(d => ({
          id: d.id,
          songId: String(d.data().songId),
          playedAt: d.data().playedAt?.toMillis?.() ?? 0,
          progressSeconds: Number(d.data().progressSeconds ?? 0),
          durationSeconds: Number(d.data().durationSeconds ?? 0),
          listenedSeconds: Number(d.data().listenedSeconds ?? 0),
          completed: d.data().completed === true,
          counted: d.data().counted === true,
        })),
      ),
    fail,
  );
}

export async function savePlaylist(
  uid: string,
  id: string | null,
  name: string,
  description: string,
) {
  const db = getFirebaseDb();

  const ref = id
    ? doc(db, "users", uid, "playlists", id)
    : doc(collection(db, "users", uid, "playlists"));

  const data = {
    name: cleanText(name, "tên playlist", 80),
    description: cleanText(description, "mô tả", 500, false),
    updatedAt: serverTimestamp(),
  };

  if (id) {
    await updateDoc(ref, data);
  } else {
    await setDoc(ref, {
      ...data,
      userId: uid,
      visibility: "private",
      songIds: [],
      songCount: 0,
      createdAt: serverTimestamp(),
    });
  }
}

export function deletePlaylist(uid: string, id: string) {
  return deleteDoc(
    doc(getFirebaseDb(), "users", uid, "playlists", id),
  );
}

export async function changePlaylistSong(
  uid: string,
  id: string,
  songId: string,
  add: boolean,
) {
  const db = getFirebaseDb();
  const ref = doc(db, "users", uid, "playlists", id);

  await runTransaction(db, async transaction => {
    const snap = await transaction.get(ref);

    if (!snap.exists()) {
      throw new Error("Playlist không tồn tại.");
    }

    const ids = new Set<string>(snap.data().songIds ?? []);

    if (add) ids.add(songId);
    else ids.delete(songId);

    if (ids.size > 50) {
      throw new Error("Playlist tối đa 50 bài.");
    }

    transaction.update(ref, {
      songIds: [...ids],
      songCount: ids.size,
      updatedAt: serverTimestamp(),
    });
  });
}

export function setFavorite(
  uid: string,
  songId: string,
  value: boolean,
) {
  const ref = doc(
    getFirebaseDb(),
    "users",
    uid,
    "favorites",
    songId,
  );

  return value
    ? setDoc(ref, {
        songId,
        favoritedAt: serverTimestamp(),
      })
    : deleteDoc(ref);
}

export async function setFollow(
  uid: string,
  target: string,
  value: boolean,
) {
  if (uid === target) {
    throw new Error("Không thể tự theo dõi.");
  }

  const db = getFirebaseDb();
  const ref = doc(db, "users", uid, "following", target);

  await runTransaction(db, async transaction => {
    const [relation, profile] = await Promise.all([
      transaction.get(ref),
      transaction.get(doc(db, "users", target)),
    ]);

    if (!profile.exists()) {
      throw new Error("Không tìm thấy nghệ sĩ.");
    }

    if (relation.exists() === value) return;

    const delta = value ? 1 : -1;

    if (value) {
      transaction.set(ref, {
        userId: target,
        followedAt: serverTimestamp(),
      });
    } else {
      transaction.delete(ref);
    }

    transaction.update(doc(db, "users", uid), {
      followingCount: increment(delta),
      lastFollowingId: target,
    });

    transaction.update(doc(db, "users", target), {
      followerCount: increment(delta),
    });


    transaction.update(doc(db, "users", target), {
      followerCount: increment(delta),
    });
  });
}

export async function trimHistory(uid: string) {
  const { getDocs } = await import("firebase/firestore");

  const all = await getDocs(
    query(
      collection(getFirebaseDb(), "users", uid, "history"),
      orderBy("playedAt", "desc"),
    ),
  );

  for (const d of all.docs.slice(100)) {
    await deleteDoc(d.ref);
  }
}
