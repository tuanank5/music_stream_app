import {
  collection,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { getFirebaseDb } from "./firebase";
import { Song } from "../types/domain";
import { trimHistory } from "./libraryService";

export function newHistoryId(uid: string) {
  return doc(
    collection(getFirebaseDb(), "users", uid, "history"),
  ).id;
}

export async function savePlayback(
  uid: string,
  historyId: string,
  song: Song,
  progressSeconds: number,
  durationSeconds: number,
  listenedSeconds: number,
  completed: boolean,
) {
  const db = getFirebaseDb();

  const ref = doc(
    db,
    "users",
    uid,
    "history",
    historyId,
  );

  const songRef = doc(db, "songs", song.id);

  const receipt = doc(
    db,
    "users",
    uid,
    "playReceipts",
    song.id,
  );

  const created = await runTransaction(
    db,
    async transaction => {
      const [history, track, lastReceipt] = await Promise.all([
        transaction.get(ref),
        transaction.get(songRef),
        transaction.get(receipt),
      ]);

      if (!track.exists()) {
        throw new Error("Bài hát không còn tồn tại.");
      }

      const now = Date.now();
      const lastCountedAt =
        lastReceipt.data()?.countedAt?.toMillis?.() ?? 0;

      const duration = Math.max(
        0,
        Math.min(86400, durationSeconds),
      );

      const progress = Math.max(
        0,
        Math.min(progressSeconds, duration),
      );

      const heard = Math.max(0, listenedSeconds);

      const eligible =
        history.exists() &&
        !history.data().counted &&
        heard >= 60 &&
        now -
          (history.data().startedAt?.toMillis?.() ?? now) >=
          60000 &&
        now - lastCountedAt >= 60000;

      const values = {
        historyId,
        songId: song.id,
        playedAt: serverTimestamp(),
        progressSeconds: progress,
        durationSeconds: duration,
        listenedSeconds: heard,
        completed,
        counted:
          history.data()?.counted === true || eligible,
      };

      if (history.exists()) {
        transaction.update(ref, values);
      } else {
        transaction.set(ref, {
          ...values,
          counted: false,
          listenedSeconds: 0,
          startedAt: serverTimestamp(),
        });
      }

      if (eligible) {
        transaction.set(receipt, {
          historyId,
          countedAt: serverTimestamp(),
        });

        transaction.update(songRef, {
          playCount: increment(1),
          lastPlayUid: uid,
          lastPlayHistoryId: historyId,
        });
      }

      return !history.exists();
    },
  );

  if (created) {
    await trimHistory(uid);
  }
}