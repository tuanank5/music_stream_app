import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { createRequestCache } from "../utils/createRequest";
import { newSongId } from "../services/catalogService";
import { Switch } from "react-native";
import { XStack, YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { useAction } from "../hooks/useAction";
import {
  changePlaylistSong,
  deletePlaylist,
  savePlaylist,
} from "../services/libraryService";
import type { Album, Artist, Playlist, Song } from "../types/domain";
import { confirmDelete } from "../utils/feedback";
import { normalizeSearch } from "../utils/validation";
import Artwork from "./Artwork";
import { useAlbumFavorites } from "../contexts/AlbumFavoritesContext";
import AlbumFavoriteButton from "./AlbumFavoriteButton";
import { MediaRow } from "./MediaRow";
import SongRow from "./SongRow";
import {
  ArtistAvatar,
  BackButton,
  FollowButton,
} from "./discovery/DiscoveryCards";
import {
  AppIcon,
  AppText,
  Button,
  EmptyState,
  ErrorText,
  Field,
  FilterBar,
  IconButton,
  ListPage,
  Loading,
  ModalPanel,
  Page,
  SearchField,
} from "./UI";

function PlaylistItem({
  playlist,
  onMore,
}: {
  playlist: Playlist;
  onMore?: () => void;
}) {
  const { songs } = useData();
  const { user } = useAuth();
  const cover =
    playlist.songIds
      .map((id) => songs.find((song) => song.id === id)?.cover)
      .find(Boolean) || "";
  return (
    <MediaRow
      title={playlist.name}
      subtitle={`${user?.displayName || "Người dùng"} · Playlist · ${playlist.songIds.length} bài hát`}
      leading={<Artwork uri={cover} size={60} radius={4} />}
      onPress={() =>
        router.push({ pathname: "/playlist", params: { id: playlist.id } })
      }
      trailing={
        onMore ? (
          <IconButton
            onPress={onMore}
            aria-label={`Thao tác với ${playlist.name}`}
          >
            <AppIcon name="more" />
          </IconButton>
        ) : undefined
      }
    />
  );
}

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
      | "/uploads"
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
                onPress={() => router.push("/uploads")}
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

export function PlaylistsScreen() {
  const { user } = useAuth();
  const data = useData();
  const action = useAction();
  const createRequest = useRef(createRequestCache(newSongId));
  const [panel, setPanel] = useState<"form" | "actions" | null>(null);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setPublic] = useState(false);
  function openForm(playlist: Playlist | null) {
    createRequest.current.reset();
    action.setError("");
    setSelected(playlist);
    setName(playlist?.name || "");
    setDescription(playlist?.description || "");
    setPublic(playlist?.isPublic ?? false);
    setPanel("form");
  }
  return (
    <>
      <ListPage
        title="Playlist của bạn"
        titleLeading={<BackButton inline fallback="/library" />}
        titleTrailing={
          <IconButton
            backgroundColor="contrast"
            aria-label="Tạo playlist"
            onPress={() => openForm(null)}
          >
            <AppIcon name="add" color="white" />
          </IconButton>
        }
        data={data.playlists}
        keyExtractor={(item) => item.id}
        renderItem={(playlist) => (
          <PlaylistItem
            playlist={playlist}
            onMore={() => {
              action.setError("");
              setSelected(playlist);
              setPanel("actions");
            }}
          />
        )}
        footer={
          <>
            <ErrorText message={!panel ? action.error : ""} />
            {data.loading ? (
              <Loading />
            ) : !data.playlists.length ? (
              <EmptyState message="Tạo playlist đầu tiên để lưu những bài hát bạn muốn nghe cùng nhau." />
            ) : null}
          </>
        }
      />
      {panel && (
        <ModalPanel
          open
          onClose={() => {
            if (!action.busy) setPanel(null);
          }}
          title={
            panel === "form"
              ? selected
                ? "Chỉnh sửa playlist"
                : "Playlist mới"
              : selected?.name || "Playlist"
          }
          description=""
        >
          <ErrorText message={action.error} />
          {panel === "form" ? (
            <>
              <Field
                label="Tên playlist"
                value={name}
                onChange={setName}
                autoCapitalize="sentences"
              />
              <Field
                label="Mô tả"
                value={description}
                onChange={setDescription}
                multiline
              />
              <Button
                title={selected ? "Lưu thay đổi" : "Tạo playlist"}
                loading={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (!user) return;
                    await savePlaylist(
                      user.uid,
                      selected?.id ?? null,
                      name,
                      description,
                      isPublic,
                      createRequest.current.key(user.uid, {
                        name,
                        description,
                        isPublic,
                      }),
                    );
                    setPanel(null);
                  })
                }
              />
              <XStack alignItems="center" justifyContent="space-between">
                <AppText>Công khai</AppText>
                <Switch
                  accessibilityLabel="Công khai playlist"
                  value={isPublic}
                  disabled={action.busy}
                  onValueChange={setPublic}
                />
              </XStack>
            </>
          ) : selected ? (
            <>
              <Button
                title="Chỉnh sửa playlist"
                variant="secondary"
                onPress={() => openForm(selected)}
              />
              <Button
                title={selected.isPublic ? "Riêng tư" : "Công khai"}
                variant="secondary"
                disabled={action.busy}
                onPress={() =>
                  void action.run(async () => {
                    if (!user) return;
                    await savePlaylist(
                      user.uid,
                      selected.id,
                      selected.name,
                      selected.description,
                      !selected.isPublic,
                    );
                    setPanel(null);
                  })
                }
              />
              <Button
                title="Thêm bài hát"
                variant="secondary"
                disabled={action.busy}
                onPress={() => {
                  setPanel(null);
                  router.push("/search");
                }}
              />
              <Button
                title="Xóa playlist"
                variant="danger"
                disabled={action.busy}
                onPress={() =>
                  confirmDelete(
                    "Thao tác này sẽ xóa vĩnh viễn playlist này. Bạn có chắc chắn muốn tiếp tục không?",
                    () =>
                      void action.run(async () => {
                        if (!user) return;
                        await deletePlaylist(user.uid, selected.id);
                        setPanel(null);
                      }),
                    "Xóa playlist?",
                  )
                }
              />
            </>
          ) : null}
        </ModalPanel>
      )}
    </>
  );
}

export function PlaylistDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const data = useData();
  const { user } = useAuth();
  const action = useAction();
  const playlist = data.playlists.find((item) => item.id === id);
  if (!playlist)
    return (
      <Page
        title="Playlist"
        titleLeading={<BackButton inline fallback="/playlists" />}
      >
        {data.loading ? (
          <Loading />
        ) : (
          <EmptyState message="Không tìm thấy playlist của bạn." />
        )}
      </Page>
    );
  const songs = playlist.songIds.flatMap((id) => {
    const song = data.songs.find((item) => item.id === id && item.active);
    return song ? [song] : [];
  });
  const missingIds = playlist.songIds.filter(
    (id) => !songs.some((song) => song.id === id),
  );
  return (
    <ListPage
      title={playlist.name}
      titleLeading={<BackButton inline fallback="/playlists" />}
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => (
        <SongRow
          song={song}
          queue={songs}
          onRemove={() =>
            void action.run(async () => {
              if (user)
                await changePlaylistSong(user.uid, playlist.id, song.id, false);
            })
          }
        />
      )}
      header={
        <YStack gap="3" marginBottom="4">
          <Artwork
            uri={songs.find((song) => song.cover)?.cover || ""}
            size={160}
            radius={8}
          />
          <AppText variant="muted">
            {playlist.description || "Bộ sưu tập âm nhạc của bạn"}
          </AppText>
          <AppText variant="caption">{songs.length} bài hát khả dụng</AppText>
          <ErrorText message={action.error} />
        </YStack>
      }
      footer={
        <>
          {missingIds.length > 0 && (
            <AppText variant="caption">
              {missingIds.length} bài không còn khả dụng. Bạn có thể gỡ liên kết
              bên dưới.
            </AppText>
          )}
          {missingIds.map((songId) => (
            <Button
              key={songId}
              title={`Gỡ bài không khả dụng: ${songId}`}
              variant="secondary"
              disabled={action.busy}
              onPress={() =>
                void action.run(async () => {
                  if (user)
                    await changePlaylistSong(
                      user.uid,
                      playlist.id,
                      songId,
                      false,
                    );
                })
              }
            />
          ))}
          {!songs.length && (
            <EmptyState message="Playlist chưa có bài khả dụng. Mở menu … của bài hát để thêm vào playlist." />
          )}
          <Button title="Thêm bài hát" onPress={() => router.push("/search")} />
        </>
      }
    />
  );
}

export function FavoritesScreen() {
  const data = useData();
  const songs = data.songs.filter(
    (song) => song.active && data.favoriteIds.includes(song.id),
  );
  return (
    <ListPage
      title="Bài hát yêu thích"
      titleLeading={<BackButton inline fallback="/library" />}
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => <SongRow song={song} queue={songs} />}
      footer={
        data.loading ? (
          <Loading />
        ) : !songs.length ? (
          <EmptyState message="Mở menu … của bài hát rồi chọn Thêm vào yêu thích." />
        ) : null
      }
    />
  );
}
