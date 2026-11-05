import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "../contexts/AuthContext";
import { backendGet } from "../services/backendService";
import { createPager, type CursorPage } from "../utils/pager";
import type { SearchResult } from "../types/search";
export function useCursorList(
  path: string,
  params: Record<string, string>,
  enabled = true,
  delay = 0,
) {
  const { user } = useAuth();
  const uid = user?.uid,
    serialized = JSON.stringify(params);
  const pager = useMemo(
    () =>
      createPager<SearchResult>(
        (cursor, size) => {
          if (!uid) throw new Error("Cần đăng nhập.");
          return backendGet<CursorPage<SearchResult>>(path, {
            ...JSON.parse(serialized),
            pageSize: String(size),
            ...(cursor ? { cursor } : {}),
          });
        },
        (result) => `${result.kind}:${result.item.id}`,
      ),
    [path, serialized, uid],
  );
  const state = useSyncExternalStore(
    pager.subscribe,
    pager.getSnapshot,
    pager.getSnapshot,
  );
  useEffect(() => {
    pager.start();
    const timer =
      enabled && uid
        ? setTimeout(() => {
            void pager.load();
          }, delay)
        : undefined;
    return () => {
      clearTimeout(timer);
      pager.stop();
    };
  }, [pager, enabled, uid, delay]);
  return { ...state, loadMore: pager.load };
}
