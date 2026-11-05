import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createHistorySource } from "../services/historyPageService";
import { createPager } from "../utils/pager";
export function useHistoryPage() {
  const { user } = useAuth();
  const uid = user?.uid;
  const pager = useMemo(
    () =>
      createPager(createHistorySource(uid ?? ""), (row) => row.song.id, 10, 10),
    [uid],
  );
  const state = useSyncExternalStore(
    pager.subscribe,
    pager.getSnapshot,
    pager.getSnapshot,
  );
  useEffect(() => {
    pager.start();
    if (uid) void pager.load();
    return pager.stop;
  }, [pager, uid]);
  return { ...state, loadMore: pager.load };
}
