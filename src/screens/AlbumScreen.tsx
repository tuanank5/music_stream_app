import SongRow from "../components/SongRow";
import AlbumFavoriteButton from "../components/AlbumFavoriteButton";
import { useAlbumFavorites } from "../contexts/AlbumFavoritesContext";
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { backendDelete } from "../services/backendService";
import { BackButton } from "../components/ui/BackButton";
import {
  AppText,
  Button,
  EmptyState,
  ErrorText,
  ListPage,
  Loading,
} from "../components/ui/index";
import Artwork from "../components/Artwork";
import { YStack } from "tamagui";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useCursorList } from "../hooks/useCursorList";
import { useBackendResource } from "../hooks/useBackendResource";
import type { Album } from "../types/domain";
import LoadMore from "../components/LoadMore";
export default function AlbumScreen({
  id,
  owned = false,
}: {
  id: string;
  owned?: boolean;
}) {
  const { user } = useAuth();
  const albumFavorites = useAlbumFavorites();
  const action = useAction();
  const [revision, setRevision] = useState(0);
  useFocusEffect(
    useCallback(() => {
      setRevision((value) => value + 1);
    }, []),
  );
  const data = useCursorList(owned ? "/uploads" : "/collection", {
    albumId: id,
    refresh: String(revision),
  });
  const info = useBackendResource<{ album: Album; totalPlayCount: number }>(
    owned ? "/my-album-info" : "/album-info",
    { id, refresh: String(revision) },
  );
  const player = usePlayerActions();
  const album = info.value?.album;
  const songs = data.items.flatMap((result) =>
    result.kind === "song" ? [result.item] : [],
  );
  return (
    <ListPage
      title={album?.title || "Album"}
      titleLeading={<BackButton inline />}
      data={songs}
      onEndReached={() => {
        if (data.started && !data.error) void data.loadMore();
      }}
      renderItem={(song) => (
        <SongRow
          key={song.id}
          song={song}
          queue={songs}
          onChanged={() => setRevision((value) => value + 1)}
          removeLabel="Gỡ khỏi Album"
          onRemove={
            album?.artistId === user?.uid && song.artistId === user?.uid
              ? () => {
                  void action.run(async () => {
                    await backendDelete(
                      `/albums/${encodeURIComponent(id)}/songs/${encodeURIComponent(song.id)}`,
                    );
                    setRevision((value) => value + 1);
                  });
                }
              : undefined
          }
        />
      )}
      keyExtractor={(item) => item.id}
      header={
        <YStack gap="3" marginBottom="4">
          <ErrorText message={action.error || info.error} />
          <ErrorText message={albumFavorites.error} />
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
          <AppText variant="muted" textAlign="center">
            {info.value?.totalPlayCount ?? 0} lượt nghe
          </AppText>
          {album ? <AlbumFavoriteButton id={id} /> : null}
          <Button
            title="Phát Album"
            disabled={!songs.length}
            onPress={() => {
              if (songs.length) {
                player.play(songs[0], songs);
              }
            }}
          />
        </YStack>
      }
      footer={
        <>
          <LoadMore {...data} />
          {info.loading ? (
            <Loading />
          ) : !songs.length && !data.loading ? (
            <EmptyState
              message={
                owned
                  ? "Album chưa có bài hát khả dụng."
                  : "Album chưa có bài hát công khai khả dụng."
              }
            />
          ) : null}
          {owned && album?.artistId === user?.uid ? (
            <Button
              title="Thêm bài hát"
              variant="secondary"
              disabled={action.busy}
              onPress={() =>
                router.push({ pathname: "/album-add", params: { id } })
              }
            />
          ) : null}
        </>
      }
    />
  );
}
