import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAuth } from "../contexts/AuthContext";
import { backendGet } from "../services/backendService";
import { createPager } from "../utils/pager";
export function useFeedPage<T extends { id: string }>(path: string) {
  const { user } = useAuth();
  const uid = user?.uid;
  const [revision, setRevision] = useState(0);
  const pager = useMemo(
    () =>
      createPager<T>(
        async (cursor, size) => {
          const page = await backendGet<{
            items: T[];
            nextCursor: string | null;
          }>(path, {
            pageSize: String(size),
            ...(cursor ? { cursor } : {}),
          });
          return { ...page, hasMore: page.nextCursor !== null };
        },
        (item) => `${uid}:${revision}:${item.id}`,
      ),
    [path, uid, revision],
  );
  const state = useSyncExternalStore(
    pager.subscribe,
    pager.getSnapshot,
    pager.getSnapshot,
  );
  useEffect(() => {
    pager.start();
    if (uid) void pager.load();
    return () => pager.stop();
  }, [pager, uid]);
  return {
    ...state,
    loadMore: pager.load,
    refresh: () => setRevision((value) => value + 1),
  };
}
