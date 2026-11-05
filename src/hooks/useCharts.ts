import type { MusicChart } from "../types/discovery";
import { useBackendResource, useDiscoverySeed } from "./useBackendResource";
export function useCharts() {
  const seed = useDiscoverySeed();
  const state = useBackendResource<{ charts: MusicChart[] }>("/charts", {
    seed,
  });
  return {
    charts: state.value?.charts ?? [],
    loading: state.loading,
    error: state.error,
  };
}
