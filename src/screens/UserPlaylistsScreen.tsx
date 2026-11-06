import { useUserPlaylists } from "../hooks/useUserPlaylists";

import LoadMore from "../components/LoadMore";
import { EmptyState, ErrorText, ListPage } from "../components/ui/index";
import { BackButton } from "../components/ui/BackButton";
import { PlaylistRow } from "../components/PlaylistRow";
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
      renderItem={(item) => <PlaylistRow item={item} />}
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
