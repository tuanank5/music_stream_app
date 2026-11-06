import { useState } from "react";
import { useCursorList } from "../hooks/useCursorList";
import { useBackendResource } from "../hooks/useBackendResource";
import { useAction } from "../hooks/useAction";
import { backendPut } from "../services/backendService";
import { MediaRow } from "../components/MediaRow";
import Artwork from "../components/Artwork";
import LoadMore from "../components/LoadMore";
import { BackButton } from "../components/ui/BackButton";
import {
  AppIcon,
  AppText,
  EmptyState,
  ErrorText,
  IconButton,
  ListPage,
  SearchField,
} from "../components/ui/index";

export default function AlbumAddSongsScreen({ id }: { id: string }) {
  const [query, setQuery] = useState(""),
    [added, setAdded] = useState<string[]>([]);
  const info = useBackendResource<{ album: { title: string } }>(
    "/my-album-info",
    { id },
  );
  const data = useCursorList(
    "/uploads",
    { unassigned: "1", q: query },
    !!info.value,
    300,
  );
  const action = useAction();
  const songs = data.items.flatMap((row) =>
    row.kind === "song" && !added.includes(row.item.id) ? [row.item] : [],
  );
  return (
    <ListPage
      title="Thêm bài hát"
      titleLeading={
        <BackButton inline fallback="/my-uploads" disabled={action.busy} />
      }
      data={songs}
      keyExtractor={(song) => song.id}
      onEndReached={() => {
        if (data.started && !data.error) void data.loadMore();
      }}
      header={
        <>
          <AppText>{info.value?.album.title || "Album"}</AppText>
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Tìm bài hát chưa thuộc album"
          />
          <ErrorText message={info.error || action.error} />
        </>
      }
      renderItem={(song) => (
        <MediaRow
          title={song.title}
          subtitle={song.artist}
          leading={<Artwork uri={song.cover} size={60} radius={4} />}
          onPress={() => {}}
          trailing={
            <IconButton
              aria-label={`Thêm ${song.title} vào album`}
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await backendPut(
                    `/albums/${encodeURIComponent(id)}/songs/${encodeURIComponent(song.id)}`,
                  );
                  setAdded((previous) => [...previous, song.id]);
                })
              }
            >
              <AppIcon name="add" />
            </IconButton>
          }
        />
      )}
      footer={
        <>
          <LoadMore {...data} />
          {!data.loading &&
          !data.hasMore &&
          !data.error &&
          !info.error &&
          !songs.length ? (
            <EmptyState message="Không có bài hát chưa thuộc album nào." />
          ) : null}
        </>
      }
    />
  );
}
