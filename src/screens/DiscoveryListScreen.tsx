import { router } from "expo-router";
import { useCursorList } from "../hooks/useCursorList";
import LoadMore from "../components/LoadMore";
import type { Album, Artist } from "../types/domain";
import Artwork from "../components/Artwork";
import AlbumFavoriteButton from "../components/AlbumFavoriteButton";
import { useAlbumFavorites } from "../contexts/AlbumFavoritesContext";
import { MediaRow } from "../components/MediaRow";
import { ArtistAvatar } from "../components/discovery/ArtistAvatar";
import { FollowButton } from "../components/discovery/FollowButton";
import {
  AppText,
  BackButton,
  EmptyState,
  ErrorText,
  ListPage,
} from "../components/ui/index";

type Item =
  { kind: "album"; album: Album } | { kind: "artist"; artist: Artist };

// Both Home rails use the same ordering and shared data session as these lists.
export default function DiscoveryListScreen({
  kind,
}: {
  kind: "albums" | "artists";
}) {
  const state = useCursorList("/browse", { kind });
  const albumFavorites = useAlbumFavorites();
  const items: Item[] = state.items.flatMap<Item>((result) =>
    result.kind === "album"
      ? [{ kind: "album" as const, album: result.item }]
      : result.kind === "artist"
        ? [{ kind: "artist" as const, artist: result.item }]
        : [],
  );
  const errors = state.error ? [state.error] : [];
  return (
    <ListPage<Item>
      title={kind === "albums" ? "Album thịnh hành" : "Nghệ sĩ phổ biến"}
      titleLeading={<BackButton inline />}
      data={items}
      onEndReached={() => {
        if (state.started && !state.error) void state.loadMore();
      }}
      keyExtractor={(item) =>
        item.kind === "album" ? item.album.id : item.artist.id
      }
      header={
        <>
          <AppText variant="caption">
            {kind === "albums"
              ? "Bắt nhịp xu hướng cùng những album nổi bật."
              : "Khám phá những nghệ sĩ đang được yêu thích."}
          </AppText>
          <ErrorText message={errors.join("\n")} />
          {kind === "albums" ? (
            <ErrorText message={albumFavorites.error} />
          ) : null}
        </>
      }
      renderItem={(item) => {
        if (item.kind === "album") {
          const album = item.album;
          return (
            <MediaRow
              title={album.title}
              trailing={<AlbumFavoriteButton id={album.id} />}
              subtitle={album.artistName}
              leading={<Artwork uri={album.coverUrl} size={70} radius={4} />}
              onPress={() =>
                router.push({ pathname: "/album", params: { id: album.id } })
              }
            />
          );
        }
        const artist = item.artist;
        return (
          <MediaRow
            title={artist.name}
            subtitle={`${artist.followerCount ?? 0} người theo dõi`}
            leading={<ArtistAvatar artist={artist} size={70} />}
            trailing={<FollowButton artistId={artist.id} />}
            onPress={() =>
              router.push({ pathname: "/artist", params: { id: artist.id } })
            }
          />
        );
      }}
      footer={
        <>
          <LoadMore {...state} />
          {!state.loading &&
            state.started &&
            !items.length &&
            !errors.length && (
              <EmptyState message="Chưa có nội dung để hiển thị." />
            )}
        </>
      }
    />
  );
}
