import { router } from "expo-router";
import { useMemo, useState } from "react";
import Artwork from "./Artwork";
import { MediaRow } from "./MediaRow";
import SongRow from "./SongRow";
import { ArtistAvatar, FollowButton } from "./discovery/DiscoveryCards";
import {
  AppText,
  EmptyState,
  FilterBar,
  ListPage,
  Loading,
  SearchField,
} from "./UI";
import { useData } from "../contexts/DataContext";
import type { Album, Artist, Song } from "../types/domain";
import { normalizeSearch } from "../utils/validation";

const filters = [
  { value: "all", label: "Tất cả" },
  { value: "tracks", label: "Bài hát" },
  { value: "albums", label: "Album" },
  { value: "artists", label: "Nghệ sĩ" },
] as const;
type Tab = (typeof filters)[number]["value"];
type Result =
  | { kind: "song"; item: Song }
  | { kind: "album"; item: Album }
  | { kind: "artist"; item: Artist };

export default function SearchScreen({
  autoFocus = false,
}: {
  autoFocus?: boolean;
}) {
  const data = useData();
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const q = normalizeSearch(keyword);
  const songs = useMemo(
    () =>
      data.songs.filter(
        (song) =>
          song.active &&
          normalizeSearch(
            `${song.title} ${song.artist} ${song.album}`,
          ).includes(q),
      ),
    [data.songs, q],
  );
  const artists = useMemo(
    () =>
      data.artists.filter(
        (artist) => artist.active && normalizeSearch(artist.name).includes(q),
      ),
    [data.artists, q],
  );
  const albums = useMemo(
    () =>
      data.albums.filter(
        (album) =>
          album.isPublished &&
          normalizeSearch(`${album.title} ${album.artistName}`).includes(q),
      ),
    [data.albums, q],
  );
  const results = useMemo(() => {
    const tracks: Result[] = songs.map((item) => ({ kind: "song", item }));
    const records: Result[] = albums.map((item) => ({ kind: "album", item }));
    const performers: Result[] = artists.map((item) => ({
      kind: "artist",
      item,
    }));
    if (tab === "tracks") return tracks;
    if (tab === "albums") return records;
    if (tab === "artists") return performers;
    return [
      ...performers.slice(0, 1),
      ...tracks,
      ...records,
      ...performers.slice(1),
    ];
  }, [songs, albums, artists, tab]);

  return (
    <ListPage<Result>
      title="Tìm kiếm"
      data={results}
      keyExtractor={(result) => `${result.kind}-${result.item.id}`}
      header={
        <>
          <SearchField
            value={keyword}
            onChange={setKeyword}
            autoFocus={autoFocus}
          />
          <FilterBar options={filters} value={tab} onChange={setTab} />
          <AppText variant="caption" marginBottom="3">
            {keyword
              ? `${results.length} kết quả cho “${keyword}”`
              : "Khám phá bài hát, album và nghệ sĩ"}
          </AppText>
        </>
      }
      renderItem={(result) => {
        if (result.kind === "song")
          return <SongRow song={result.item} queue={songs} />;
        if (result.kind === "artist") {
          const artist = result.item;
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
        }
        const album = result.item;
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
      }}
      footer={
        data.loading && !results.length ? (
          <Loading />
        ) : !results.length ? (
          <EmptyState message="Không có kết quả phù hợp. Hãy thử tên khác hoặc từ khóa ngắn hơn." />
        ) : null
      }
    />
  );
}
