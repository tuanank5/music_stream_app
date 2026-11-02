import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
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
  const cover =
    playlist.songIds
      .map((id) => songs.find((song) => song.id === id)?.cover)
      .find(Boolean) || "";
  return (
    <MediaRow
      title={playlist.name}
      subtitle={`${playlist.songIds.length} bài hát${playlist.description ? ` · ${playlist.description}` : ""}`}
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
  { value: "all", label: "Tất cả" },
  { value: "playlists", label: "Playlist" },
  { value: "songs", label: "Bài hát" },
  { value: "albums", label: "Album" },
  { value: "artists", label: "Nghệ sĩ" },
] as const;
type LibraryTab = (typeof libraryFilters)[number]["value"];
type LibraryItem =
  | { kind: "playlist"; item: Playlist }
  | { kind: "song"; item: Song }
  | { kind: "album"; item: Album }
  | { kind: "artist"; item: Artist };

export function LibraryScreen() {
  const data = useData();
  const [tab, setTab] = useState<LibraryTab>("all");
  const [keyword, setKeyword] = useState("");
  const [tools, setTools] = useState(false);
  const q = normalizeSearch(keyword);
  const matches = (text: string) => normalizeSearch(text).includes(q);
  const favorites = data.songs.filter(
    (song) => song.active && data.favoriteIds.includes(song.id),
  );
  const albumIds = new Set(favorites.map((song) => song.albumId));
  const items: LibraryItem[] = [
    ...data.playlists
      .filter((p) => matches(p.name))
      .map((item) => ({ kind: "playlist" as const, item })),
    ...favorites
      .filter((song) => matches(`${song.title} ${song.artist}`))
      .map((item) => ({ kind: "song" as const, item })),
    ...data.albums
      .filter(
        (album) =>
          tab === "albums" && albumIds.has(album.id) && matches(album.title),
      )
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
      tab === "all" ||
      (tab === "playlists" && item.kind === "playlist") ||
      (tab === "songs" && item.kind === "song") ||
      (tab === "albums" && item.kind === "album") ||
      (tab === "artists" && item.kind === "artist"),
  );
  function openTool(path: "/upload" | "/my-uploads" | "/profile" | "/premium") {
    setTools(false);
    router.push(path);
  }
  return (
    <>
      <ListPage<LibraryItem>
        title="Thư viện"
        titleTrailing={
          <IconButton
            aria-label="Tài khoản và công cụ"
            onPress={() => setTools(true)}
          >
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
            <FilterBar options={libraryFilters} value={tab} onChange={setTab} />
            <XStack gap="3" flexWrap="wrap" marginBottom="3">
              <Button
                title="Playlist của bạn"
                variant="secondary"
                onPress={() => router.push("/playlists")}
              />
              <Button
                title="Yêu thích"
                variant="secondary"
                onPress={() => router.push("/favorites")}
              />
            </XStack>
            {tab === "albums" && (
              <AppText variant="caption" marginBottom="3">
                Album có bài hát bạn đã yêu thích.
              </AppText>
            )}
          </>
        }
        renderItem={(result) => {
          if (result.kind === "playlist")
            return <PlaylistItem playlist={result.item} />;
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
              subtitle={result.item.artistName}
              leading={
                <Artwork uri={result.item.coverUrl} size={60} radius={4} />
              }
              onPress={() =>
                router.push({
                  pathname: "/album",
                  params: { id: result.item.id },
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
                  : "Lưu bài hát, tạo playlist hoặc theo dõi nghệ sĩ để xây dựng thư viện của bạn."
              }
            />
          ) : null
        }
      />
      {tools && (
        <ModalPanel
          open
          onClose={() => setTools(false)}
          title="Tài khoản và công cụ"
          description="Quản lý nội dung và tài khoản của bạn"
        >
          <Button title="Đăng bài hát" onPress={() => openTool("/upload")} />
          <Button
            title="Bài hát tôi đã đăng"
            variant="secondary"
            onPress={() => openTool("/my-uploads")}
          />
          <Button
            title="Hồ sơ và tài khoản"
            variant="secondary"
            onPress={() => openTool("/profile")}
          />
          <Button
            title="Giới thiệu Premium (demo)"
            variant="secondary"
            onPress={() => openTool("/premium")}
          />
          <Button
            title="Đóng"
            variant="secondary"
            onPress={() => setTools(false)}
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
  const [panel, setPanel] = useState<"form" | "actions" | null>(null);
  const [selected, setSelected] = useState<Playlist | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  function openForm(playlist: Playlist | null) {
    action.setError("");
    setSelected(playlist);
    setName(playlist?.name || "");
    setDescription(playlist?.description || "");
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
                ? "Sửa playlist"
                : "Playlist mới"
              : selected?.name || "Playlist"
          }
          description={
            panel === "form"
              ? "Đặt tên và mô tả cho bộ sưu tập của bạn."
              : `${selected?.songIds.length ?? 0} bài hát`
          }
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
                    );
                    setPanel(null);
                  })
                }
              />
            </>
          ) : selected ? (
            <>
              <Button
                title="Sửa playlist"
                variant="secondary"
                onPress={() => openForm(selected)}
              />
              <Button
                title="Xóa playlist"
                variant="danger"
                disabled={action.busy}
                onPress={() =>
                  confirmDelete(
                    "Xóa playlist? Bài hát gốc không bị xóa.",
                    () =>
                      void action.run(async () => {
                        if (!user) return;
                        await deletePlaylist(user.uid, selected.id);
                        setPanel(null);
                      }),
                  )
                }
              />
            </>
          ) : null}
          <Button
            title="Đóng"
            variant="secondary"
            disabled={action.busy}
            onPress={() => setPanel(null)}
          />
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
          <Button
            title="Tìm bài để thêm"
            onPress={() => router.push("/search")}
          />
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
