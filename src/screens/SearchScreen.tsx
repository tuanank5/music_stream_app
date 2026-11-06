import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { XStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useSearchHistory } from "../hooks/useSearchHistory";
import { validateSearchHistoryItem } from "../services/searchHistoryAccess";
import type { SearchHistoryItem } from "../utils/searchHistory";
import Artwork from "../components/Artwork";
import { MediaRow } from "../components/MediaRow";
import SongRow from "../components/SongRow";
import { ArtistAvatar } from "../components/discovery/ArtistAvatar";
import { FollowButton } from "../components/discovery/FollowButton";
import {
  AppText,
  EmptyState,
  FilterBar,
  ListPage,
  Loading,
  SearchField,
  Button,
  ErrorText,
  IconButton,
  AppIcon,
} from "../components/ui/index";
import { useCatalogData } from "../contexts/DataContext";
import type { SearchResult as Result } from "../types/search";
import { useSearch } from "../hooks/useSearch";
import LoadMore from "../components/LoadMore";

const filters = [
  { value: "tracks", label: "Bài hát" },
  { value: "albums", label: "Album" },
  { value: "artists", label: "Nghệ sĩ" },
] as const;
type Tab = (typeof filters)[number]["value"];
export default function SearchScreen({
  autoFocus = false,
}: {
  autoFocus?: boolean;
}) {
  const data = useCatalogData();
  const { user } = useAuth();
  return (
    <SearchSession
      key={user?.uid ?? "guest"}
      autoFocus={autoFocus}
      uid={user?.uid ?? ""}
      data={data}
    />
  );
}

function SearchSession({
  autoFocus,
  uid,
  data,
}: {
  autoFocus: boolean;
  uid: string;
  data: ReturnType<typeof useCatalogData>;
}) {
  const history = useSearchHistory();
  const [opening, setOpening] = useState("");
  const [openError, setOpenError] = useState("");
  const lifecycle = useRef({ active: true, pending: false });
  useEffect(() => {
    const session = lifecycle.current;
    session.active = true;
    return () => {
      session.active = false;
    };
  }, []);
  const [keyword, setKeyword] = useState("");
  const [tab, setTab] = useState<Tab | null>(null);
  const searching = keyword.trim().length > 0;
  const covers = useMemo(
    () =>
      new Map([
        ...data.songs.map((item) => [`song:${item.id}`, item.cover] as const),
        ...data.albums.map(
          (item) => [`album:${item.id}`, item.coverUrl] as const,
        ),
        ...data.artists.map(
          (item) => [`artist:${item.id}`, item.imageUrl] as const,
        ),
      ]),
    [data.songs, data.albums, data.artists],
  );
  const search = useSearch(keyword, tab);
  const results = search.items;
  const songs = results.flatMap((result) =>
    result.kind === "song" ? [result.item] : [],
  );

  const remember = (result: Result) => {
    if (result.kind === "user") return;
    const item = result.item;
    void history.add({
      kind: result.kind,
      id: item.id,
      title: result.kind === "artist" ? result.item.name : result.item.title,
      subtitle:
        result.kind === "song"
          ? result.item.artist
          : result.kind === "album"
            ? result.item.artistName
            : "",
    });
  };
  async function reopen(item: SearchHistoryItem) {
    if (lifecycle.current.pending || !uid) return;
    lifecycle.current.pending = true;
    setOpening(`${item.kind}:${item.id}`);
    setOpenError("");
    try {
      const valid = await validateSearchHistoryItem(item, uid);
      if (!lifecycle.current.active) return;
      if (!valid) {
        setOpenError("Nội dung không còn khả dụng.");
        return;
      }
      void history.add(item);
      router.push({
        pathname:
          item.kind === "song"
            ? "/song"
            : item.kind === "album"
              ? "/album"
              : "/artist",
        params: { id: item.id },
      });
    } catch {
      if (lifecycle.current.active)
        setOpenError(
          "Không thể mở nội dung. Kiểm tra kết nối hoặc quyền truy cập rồi thử lại.",
        );
    } finally {
      lifecycle.current.pending = false;
      if (lifecycle.current.active) setOpening("");
    }
  }

  if (!searching)
    return (
      <ListPage<SearchHistoryItem>
        title="Tìm kiếm"
        data={history.items}
        keyExtractor={(item) => `${item.kind}:${item.id}`}
        header={
          <>
            <SearchField
              value={keyword}
              onChange={setKeyword}
              autoFocus={autoFocus}
            />
            <XStack
              alignItems="center"
              justifyContent="space-between"
              marginVertical="3"
              gap="2"
            >
              <AppText fontWeight="700">Tìm kiếm gần đây</AppText>
              {!!history.items.length && (
                <Button
                  title="Xóa tất cả"
                  variant="secondary"
                  onPress={() => {
                    void history.clear();
                  }}
                />
              )}
            </XStack>
            <ErrorText message={history.error || openError} />
            {!!history.error && (
              <Button
                title="Thử lại"
                variant="secondary"
                onPress={() => {
                  void history.load();
                }}
              />
            )}
            {!!opening && <Loading />}
          </>
        }
        renderItem={(item) => (
          <MediaRow
            title={item.title}
            subtitle={
              item.kind === "song"
                ? `Bài hát · ${item.subtitle}`
                : item.kind === "album"
                  ? `Album · ${item.subtitle}`
                  : "Nghệ sĩ"
            }
            leading={
              <Artwork
                uri={covers.get(`${item.kind}:${item.id}`) ?? ""}
                size={70}
                radius={item.kind === "artist" ? 30 : 4}
              />
            }
            onPress={() => {
              void reopen(item);
            }}
            trailing={
              <IconButton
                aria-label={`Xóa ${item.title} khỏi tìm kiếm gần đây`}
                onPress={() => {
                  void history.remove(item);
                }}
              >
                <AppIcon name="close" />
              </IconButton>
            }
          />
        )}
        footer={
          history.loading ? (
            <Loading />
          ) : !history.items.length ? (
            <EmptyState message="Chưa có tìm kiếm gần đây. Tìm và mở Bài hát, Album hoặc Nghệ sĩ để lưu tại đây." />
          ) : null
        }
      />
    );

  return (
    <ListPage<Result>
      title="Tìm kiếm"
      data={results}
      onEndReached={() => {
        if (search.started && !search.error) void search.loadMore();
      }}
      keyExtractor={(result) => `${result.kind}-${result.item.id}`}
      header={
        <>
          <SearchField
            value={keyword}
            onChange={(value) => {
              setKeyword(value);
              if (!value.trim()) setTab(null);
            }}
            autoFocus={autoFocus}
          />
          <FilterBar
            options={filters}
            value={tab}
            onChange={(value) => setTab(tab === value ? null : value)}
          />
          <ErrorText message={history.error} />
          <AppText variant="caption" marginBottom="3">
            {keyword
              ? `Đã tải ${results.length} kết quả cho “${keyword}”`
              : "Khám phá Bài hát, Album và Nghệ sĩ"}
          </AppText>
        </>
      }
      renderItem={(result) => {
        if (result.kind === "song")
          return (
            <>
              <AppText variant="caption">Bài hát</AppText>
              <SongRow
                song={result.item}
                queue={songs}
                onOpen={() => remember(result)}
              />
            </>
          );
        if (result.kind === "artist" || result.kind === "user") {
          const artist = result.item;
          return (
            <MediaRow
              title={artist.name}
              subtitle={
                result.kind === "user"
                  ? "Người dùng"
                  : `Nghệ sĩ · ${artist.followerCount ?? 0} người theo dõi`
              }
              leading={<ArtistAvatar artist={artist} size={70} />}
              trailing={<FollowButton artistId={artist.id} />}
              onPress={() => {
                remember(result);
                router.push({
                  pathname: result.kind === "user" ? "/user" : "/artist",
                  params: { id: artist.id },
                });
              }}
            />
          );
        }
        const album = result.item;
        return (
          <MediaRow
            title={album.title}
            subtitle={`Album · ${album.artistName}`}
            leading={<Artwork uri={album.coverUrl} size={70} radius={4} />}
            onPress={() => {
              remember(result);
              router.push({ pathname: "/album", params: { id: album.id } });
            }}
          />
        );
      }}
      footer={
        <>
          {!search.loading &&
            search.started &&
            !results.length &&
            !search.error && (
              <EmptyState message="Không có kết quả phù hợp. Hãy thử tên khác hoặc từ khóa ngắn hơn." />
            )}
          <LoadMore {...search} loadMore={search.loadMore} />
        </>
      }
    />
  );
}
