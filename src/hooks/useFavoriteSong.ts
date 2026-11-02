import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { setFavorite } from "../services/libraryService";
import { useAction } from "./useAction";

export function useFavoriteSong(songId?: string) {
  const { user } = useAuth();
  const { favoriteIds } = useData();
  const action = useAction();
  const favorite = !!songId && favoriteIds.includes(songId);
  return {
    favorite,
    busy: action.busy,
    error: action.error,
    disabled: !user || !songId || action.busy,
    toggle: () => {
      if (!user || !songId) return;
      void action.run(() => setFavorite(user.uid, songId, !favorite));
    },
  };
}
