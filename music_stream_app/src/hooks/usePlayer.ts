import { useCallback, useState } from "react";
import { Song } from "../types/Song";

/** UI-only player state. TODO (phối hợp audio): replace toggles with a real Expo audio engine. */
export function usePlayer(initialSong: Song) {
  const [currentSong, setCurrentSong] = useState(initialSong);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const togglePlayback = useCallback(() => setIsPlaying((value) => !value), []);
  const selectSong = useCallback((song: Song) => {
    setCurrentSong(song);
    setPositionMs(0);
    setIsPlaying(false);
  }, []);
  return {
    currentSong,
    isPlaying,
    positionMs,
    setPositionMs,
    togglePlayback,
    selectSong,
  };
}
