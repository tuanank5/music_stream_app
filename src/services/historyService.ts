import { collection, doc } from "firebase/firestore";
import { getFirebaseDb, getFirebaseAuth } from "./firebase";
import { backendPost } from "./backendService";
import { refreshPrivateList } from "./playlistSubscriptions";
import { createPlaybackQueue } from "../utils/playbackQueue";
export function createPlaybackSession(uid: string, songId: string) {
  const user = getFirebaseAuth().currentUser;
  return createPlaybackQueue(
    songId,
    () => doc(collection(getFirebaseDb(), "users", uid, "history")).id,
    async (id, packet) => {
      if (!user || user.uid !== uid || getFirebaseAuth().currentUser !== user)
        throw new Error("Playback account changed");
      const result = await backendPost<{ refresh: boolean }>(
        `/playback/${id}`,
        packet,
      );
      if (result.refresh) refreshPrivateList(uid, "/recent-history");
      return result;
    },
  );
}
