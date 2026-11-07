import { useState } from "react";
import type { Song, Artist, Album } from "../types/domain";
import { useBackendResource, useDiscoverySeed } from "./useBackendResource";
type Discovery = {
  songs: Song[];
  suggestions: Song[];
  artists: Artist[];
  albums: (Album & { totalPlayCount: number })[];
};
export function useHomeDiscovery() {
  const [refreshCount, setRefresh] = useState(0);
  const seed = useDiscoverySeed();
  const state = useBackendResource<Discovery>("/discovery", {
    seed: seed + ":" + refreshCount,
  });
  return {
    songs: state.value?.songs ?? [],
    suggestions: state.value?.suggestions ?? [],
    artists: state.value?.artists ?? [],
    albums: state.value?.albums ?? [],
    loading: state.loading,
    errors: state.error ? ["Bài hát: " + state.error] : [],
    refresh: () => setRefresh((value) => value + 1),
  };
}
