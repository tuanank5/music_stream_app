import { router } from "expo-router";

import SongRow from "./SongRow";
import { BackButton } from "./discovery/BackButton";
import { AppText, Button, EmptyState, ListPage, Loading } from "./UI";
import Artwork from "./Artwork";
import { YStack } from "tamagui";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useCatalogData } from "../contexts/DataContext";
export default function AlbumScreen({ id }: { id: string }) {
  const data = useCatalogData();
  const player = usePlayerActions();
  const album = data.albums.find((value) => value.id === id);
  const songs = data.songs
    .filter(
      (song) =>
        song.albumId === id &&
        song.active &&
        song.isPublished &&
        song.visibility === "public",
    )
    .sort((a, b) => b.playCount - a.playCount || a.id.localeCompare(b.id));
  return (
    <ListPage
      title={album?.title || "Album"}
      titleLeading={<BackButton inline />}
      data={songs}
      renderItem={(song) => <SongRow key={song.id} song={song} queue={songs} />}
      keyExtractor={(item) => item.id}
      header={
        <YStack gap="3" marginBottom="4">
          <YStack alignItems="center" gap="3">
            <Artwork
              uri={album?.coverUrl || songs[0]?.cover || ""}
              size={200}
              radius={8}
            />
            <AppText variant="muted" textAlign="center">
              {album?.artistName || ""}
            </AppText>
          </YStack>
          <AppText variant="muted">
            {songs.reduce((total, song) => total + song.playCount, 0)} lượt nghe
          </AppText>
          <Button
            title="Phát album"
            disabled={!songs.length}
            onPress={() => {
              if (songs.length) {
                player.play(songs[0], songs);
                router.push("/player");
              }
            }}
          />
        </YStack>
      }
      footer={
        data.loading ? (
          <Loading />
        ) : !songs.length ? (
          <EmptyState message="Album chưa có bài hát công khai khả dụng." />
        ) : null
      }
    />
  );
}
