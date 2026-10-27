import { useCallback, useState } from "react";

/** Local demo state only. TODO (phối hợp Firebase): persist per-user favorites in Firestore. */
export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const toggleFavorite = useCallback((songId: string) => {
    setFavoriteIds((current) =>
      current.includes(songId)
        ? current.filter((id) => id !== songId)
        : [...current, songId],
    );
  }, []);
  const isFavorite = useCallback(
    (songId: string) => favoriteIds.includes(songId),
    [favoriteIds],
  );
  return { favoriteIds, toggleFavorite, isFavorite };
}
