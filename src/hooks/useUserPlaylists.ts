import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "../contexts/AuthContext";
import { backendGet } from "../services/backendService";
import { createPager, type CursorPage } from "../utils/pager";
import type { Playlist } from "../types/domain";
export type PublicPlaylist = Playlist & {
  ownerId: string;
  ownerName: string;
  coverUrl: string;
  songCount: number;
};
export function useUserPlaylists(ownerId: string) {
  const { user } = useAuth();
  const uid = user?.uid;
  const pager = useMemo(
    () =>
      createPager<PublicPlaylist>(
        (cursor, size) => {
          if (!uid) throw new Error("Cần đăng nhập.");
          return backendGet<CursorPage<PublicPlaylist>>("/user-playlists", {
            ownerId,
            pageSize: String(size),
            ...(cursor ? { cursor } : {}),
          });
        },
        (row) => row.id,
      ),
    [ownerId, uid],
  );
  const state = useSyncExternalStore(
    pager.subscribe,
    pager.getSnapshot,
    pager.getSnapshot,
  );
  useEffect(() => {
    pager.start();
    if (ownerId && uid) void pager.load();
    return pager.stop;
  }, [pager, ownerId, uid]);
  return { ...state, loadMore: pager.load };
}
