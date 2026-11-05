import { router } from "expo-router";
import { ScrollView, YStack } from "tamagui";
import {
  useUserPlaylists,
  type PublicPlaylist,
} from "../hooks/useUserPlaylists";
import { MediaRow } from "./MediaRow";
import Artwork from "./Artwork";
import LoadMore from "./LoadMore";
import { AppText, Button, EmptyState, ErrorText, ListPage } from "./UI";
import { BackButton } from "./discovery/BackButton";
function Row({ item }: { item: PublicPlaylist }) {
  return (
    <MediaRow
      title={item.name}
      subtitle={`${item.ownerName} · Playlist · ${item.songCount} bài hát`}
      leading={<Artwork uri={item.coverUrl} size={60} radius={4} />}
      onPress={() =>
        router.push({
          pathname: "/playlist",
          params: { id: item.id, ownerId: item.ownerId },
        })
      }
    />
  );
}
export function PublicPlaylistsSection({ ownerId }: { ownerId: string }) {
  const state = useUserPlaylists(ownerId);
  return (
    <YStack gap="3">
      <ErrorText message={state.error} />
      {state.items.length ? (
        <>
          <AppText fontWeight="700">Playlist</AppText>
          <ScrollView horizontal>
            {state.items.map((item) => (
              <YStack key={item.id} width={280}>
                <Row item={item} />
              </YStack>
            ))}
          </ScrollView>
        </>
      ) : null}
      {state.items.length || state.hasMore || state.error ? (
        <Button
          title="Xem tất cả playlist"
          variant="secondary"
          onPress={() =>
            router.push({ pathname: "/user-playlists", params: { ownerId } })
          }
        />
      ) : null}
    </YStack>
  );
}
export default function UserPlaylistsScreen({ ownerId }: { ownerId: string }) {
  const state = useUserPlaylists(ownerId);
  return (
    <ListPage
      title="Playlist công khai"
      titleLeading={<BackButton inline fallback="/library" />}
      data={state.items}
      keyExtractor={(item) => item.id}
      onEndReached={() => {
        if (state.started && !state.error) void state.loadMore();
      }}
      header={<ErrorText message={state.error} />}
      renderItem={(item) => <Row item={item} />}
      footer={
        <>
          <LoadMore {...state} />
          {!state.loading &&
          !state.error &&
          !state.hasMore &&
          !state.items.length ? (
            <EmptyState message="Chưa có playlist công khai khả dụng." />
          ) : null}
        </>
      }
    />
  );
}
