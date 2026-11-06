import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { XStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";

import type { Album, Artist, Song } from "../types/domain";

import { normalizeSearch } from "../utils/validation";
import Artwork from "../components/Artwork";
import { useAlbumFavorites } from "../contexts/AlbumFavoritesContext";
import AlbumFavoriteButton from "../components/AlbumFavoriteButton";
import { MediaRow } from "../components/MediaRow";
import SongRow from "../components/SongRow";
import { ArtistAvatar } from "../components/discovery/ArtistAvatar";

import { FollowButton } from "../components/discovery/FollowButton";
import {
  AppIcon,
  Button,
  EmptyState,
  ErrorText,
  FilterBar,
  IconButton,
  ListPage,
  Loading,
  ModalPanel,
  SearchField,
} from "../components/ui/index";
const libraryFilters = [
  { value: "songs", label: "Bài hát" },
  { value: "albums", label: "Album" },
  { value: "artists", label: "Nghệ sĩ" },
] as const;
type LibraryTab = (typeof libraryFilters)[number]["value"];
type LibraryItem =
  | { kind: "song"; item: Song }
  | { kind: "album"; item: Album }
  | { kind: "artist"; item: Artist };
export function LibraryScreen() {
  const { user } = useAuth();
  const albumFavorites = useAlbumFavorites();
  const reloadAlbumFavorites = albumFavorites.reload;
  useFocusEffect(
    useCallback(() => {
      reloadAlbumFavorites();
    }, [reloadAlbumFavorites]),
  );
  const data = useData();
  const [tab, setTab] = useState<LibraryTab | null>(null);
  const [keyword, setKeyword] = useState("");
  const [tools, setTools] = useState(false);
  const q = normalizeSearch(keyword);
  const matches = (text: string) => normalizeSearch(text).includes(q);
  const favorites = data.songs.filter(
    (song) => song.active && data.favoriteIds.includes(song.id),
  );
  const items: LibraryItem[] = [
    ...favorites
      .filter((song) => matches(`${song.title} ${song.artist}`))
      .map((item) => ({ kind: "song" as const, item })),
    ...albumFavorites.albums
      .filter((album) => matches(`${album.title} ${album.artistName}`))
      .map((item) => ({ kind: "album" as const, item })),
    ...data.artists
      .filter(
        (artist) =>
          artist.active &&
          data.followingIds.includes(artist.id) &&
          matches(artist.name),
      )
      .map((item) => ({ kind: "artist" as const, item })),
  ].filter(
    (item) =>
      tab === null ||
      (tab === "songs" && item.kind === "song") ||
      (tab === "albums" && item.kind === "album") ||
      (tab === "artists" && item.kind === "artist"),
  );
  function openTool(
    path:
      | "/upload"
      | "/my-uploads"
      | "/profile"
      | "/premium"
      | "/account"
      | "/settings",
  ) {
    setTools(false);
    router.push(path);
  }
  return (
    <>
      <ListPage<LibraryItem>
        title="Thư viện"
        titleTrailing={
          <IconButton aria-label="Cài đặt" onPress={() => setTools(true)}>
            <AppIcon name="more" />
          </IconButton>
        }
        data={items}
        keyExtractor={(item) => `${item.kind}-${item.item.id}`}
        header={
          <>
            <SearchField
              value={keyword}
              onChange={setKeyword}
              placeholder="Tìm trong thư viện"
            />
            <FilterBar
              options={libraryFilters}
              value={tab}
              onChange={(value) => setTab(tab === value ? null : value)}
            />
            <XStack gap="2" marginBottom="3" flexWrap="wrap">
              <Button
                title="Playlist của bạn"
                variant="secondary"
                onPress={() => router.push("/playlists")}
              />
              <Button
                title="Lịch sử"
                variant="secondary"
                onPress={() => router.push("/history")}
              />
              <Button
                title="Bài hát đã đăng tải"
                variant="secondary"
                onPress={() => router.push("/my-uploads")}
              />
            </XStack>
            <ErrorText message={albumFavorites.error} />
            {albumFavorites.error ? (
              <Button
                title="Thử tải lại album yêu thích"
                variant="secondary"
                onPress={albumFavorites.reload}
              />
            ) : null}
          </>
        }
        renderItem={(result) => {
          if (result.kind === "song")
            return <SongRow song={result.item} queue={favorites} />;
          if (result.kind === "artist")
            return (
              <MediaRow
                title={result.item.name}
                leading={<ArtistAvatar artist={result.item} size={60} />}
                trailing={<FollowButton artistId={result.item.id} />}
                onPress={() =>
                  router.push({
                    pathname: "/artist",
                    params: { id: result.item.id },
                  })
                }
              />
            );
          return (
            <MediaRow
              title={result.item.title}
              trailing={<AlbumFavoriteButton id={result.item.id} />}
              subtitle={result.item.artistName}
              leading={
                <Artwork uri={result.item.coverUrl} size={60} radius={4} />
              }
              onPress={() =>
                router.push({
                  pathname: "/album",
                  params: {
                    id: result.item.id,
                    ...(result.item.artistId === user?.uid
                      ? { owned: "1" }
                      : {}),
                  },
                })
              }
            />
          );
        }}
        footer={
          data.loading && !items.length ? (
            <Loading />
          ) : !items.length ? (
            <EmptyState
              message={
                keyword
                  ? "Không có kết quả trong thư viện."
                  : "Yêu thích bài hát hoặc theo dõi nghệ sĩ để xây dựng thư viện của bạn."
              }
            />
          ) : null
        }
      />
      {tools && (
        <ModalPanel
          open
          onClose={() => setTools(false)}
          title="Cài đặt"
          description=""
        >
          <Button
            title="Hồ sơ"
            variant="secondary"
            onPress={() => openTool("/profile")}
          />
          <Button
            title="Tài khoản"
            variant="secondary"
            onPress={() => openTool("/account")}
          />
          <Button
            title="Cài đặt cơ bản"
            variant="secondary"
            onPress={() => openTool("/settings")}
          />
          <Button
            title="Đăng tải bài hát"
            variant="secondary"
            onPress={() => openTool("/upload")}
          />
          <Button
            title="Premium"
            variant="secondary"
            onPress={() => openTool("/premium")}
          />
        </ModalPanel>
      )}
    </>
  );
}
