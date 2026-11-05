import { useBackendResource } from "./useBackendResource";
import type { Artist } from "../types/domain";
import { useLibraryData } from "../contexts/DataContext";
export function usePublicProfile(id: string) {
  const { followingIds } = useLibraryData();
  const state = useBackendResource<Artist>(
    `/profiles/${encodeURIComponent(id || "missing")}`,
    {},
    `${followingIds.includes(id)}:${followingIds.length}`,
  );
  return {
    ...state,
    profile: state.value,
    items: state.value ? [state.value] : [],
  };
}
