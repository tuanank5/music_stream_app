import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "../contexts/AuthContext";
import { backendGet } from "../services/backendService";
import { createPager } from "../utils/pager";
export function useDiscoverySeed() {
  const { user } = useAuth();
  return `${user?.uid ?? ""}:${user?.metadata?.lastSignInTime ?? "session"}`;
}
export function useBackendResource<T>(
  path: string,
  params: Record<string, string> = {},
  refreshKey = "",
) {
  const { user } = useAuth();
  const uid = user?.uid,
    serialized = JSON.stringify(params);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const pager = useMemo(
    () =>
      createPager<T>(
        async () => {
          if (!uid) throw new Error("Cần đăng nhập.");
          const payload = await backendGet<T>(path, JSON.parse(serialized));
          return { items: [payload], hasMore: false, nextCursor: null };
        },
        () => `resource:${refreshKey}:${revision}`,
      ),
    [path, serialized, uid, refreshKey, revision],
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
  return {
    value: state.items[0],
    loading: state.loading || (!state.started && !state.error),
    error: state.error,
    retry: pager.load,
    refresh,
  };
}
