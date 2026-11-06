import { useAlbumFavorites } from "../contexts/AlbumFavoritesContext";
import { AppIcon, IconButton } from "./ui/index";
export default function AlbumFavoriteButton({ id }: { id: string }) {
  const favorites = useAlbumFavorites();
  const selected = favorites.albums.some((album) => album.id === id);
  return (
    <IconButton
      aria-label={selected ? "Bỏ yêu thích Album" : "Yêu thích Album"}
      aria-pressed={selected}
      disabled={favorites.loading || favorites.pending.has(id)}
      onPress={() => void favorites.toggle(id)}
    >
      <AppIcon
        name={selected ? "heart" : "heart-outline"}
        color="danger"
      />
    </IconButton>
  );
}
