import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useFocusEffect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { searchHistoryService } from "../services/searchHistoryService";

export function useSearchHistory() {
  const { user } = useAuth();
  const uid = user?.uid ?? "";
  const session = useMemo(() => searchHistoryService.session(uid), [uid]);
  const state = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );
  useFocusEffect(
    useCallback(() => {
      if (uid) void session.load();
    }, [session, uid]),
  );
  return { ...state, ...session };
}
