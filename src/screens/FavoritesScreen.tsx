import { useData } from "../contexts/DataContext";

import SongRow from "../components/SongRow";

import { BackButton } from "../components/ui/BackButton";

import { EmptyState, ListPage, Loading } from "../components/ui/index";

export function FavoritesScreen() {
  const data = useData();
  const songs = data.songs.filter(
    (song) => song.active && data.favoriteIds.includes(song.id),
  );
  return (
    <ListPage
      title="Bài hát yêu thích"
      titleLeading={<BackButton inline fallback="/library" />}
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => <SongRow song={song} queue={songs} />}
      footer={
        data.loading ? (
          <Loading />
        ) : !songs.length ? (
          <EmptyState message="Mở menu … của bài hát rồi chọn Thêm vào yêu thích." />
        ) : null
      }
    />
  );
}
