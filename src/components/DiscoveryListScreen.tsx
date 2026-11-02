import { router } from "expo-router";
import { useHomeDiscovery } from "../hooks/useHomeDiscovery";
import type { Album, Artist } from "../types/domain";
import Artwork from "./Artwork";
import { MediaRow } from "./MediaRow";
import { ArtistAvatar, FollowButton } from "./discovery/DiscoveryCards";
import { BackButton, EmptyState, ErrorText, ListPage, Loading } from "./UI";

type Item =
  { kind: "album"; album: Album } | { kind: "artist"; artist: Artist };

// Both Home rails use the same ordering and shared data session as these lists.
export default function DiscoveryListScreen({
  kind,
}: {
  kind: "albums" | "artists";
}) {
  const state = useHomeDiscovery();
  const items: Item[] =
    kind === "albums"
      ? state.albums.map((album) => ({ kind: "album", album }))
      : state.artists.map((artist) => ({ kind: "artist", artist }));
  const errors = state.errors.filter(
    (error) =>
      error.startsWith("Songs:") ||
      error.startsWith(kind === "albums" ? "Albums:" : "Artists:"),
  );
  return (
    <ListPage<Item>
      title={kind === "albums" ? "Trending albums" : "Popular artists"}
      titleLeading={<BackButton inline />}
      data={items}
      keyExtractor={(item) =>
        item.kind === "album" ? item.album.id : item.artist.id
      }
      header={<ErrorText message={errors.join("\n")} />}
      renderItem={(item) => {
        if (item.kind === "album") {
          const album = item.album;
          return (
            <MediaRow
              title={album.title}
              subtitle={album.artistName}
              leading={<Artwork uri={album.coverUrl} size={60} radius={4} />}
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
            leading={<ArtistAvatar artist={artist} size={60} />}
            trailing={<FollowButton artistId={artist.id} />}
            onPress={() =>
              router.push({ pathname: "/artist", params: { id: artist.id } })
            }
          />
        );
      }}
      footer={
        state.loading && !items.length ? (
          <Loading />
        ) : !items.length && !errors.length ? (
          <EmptyState message="Chưa có nội dung để hiển thị." />
        ) : null
      }
    />
  );
}
