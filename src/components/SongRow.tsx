import { router } from "expo-router";
import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { getFirebaseAuth } from "../services/firebase";
import { uploadMedia } from "../services/mediaUploadService";
import { backendDelete, backendPatch } from "../services/backendService";
import { XStack, YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useLibraryData } from "../contexts/DataContext";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { changePlaylistSong } from "../services/libraryService";
import { useFavoriteSong } from "../hooks/useFavoriteSong";
import type { Song } from "../types/domain";
import { formatDuration, normalizeSearch } from "../utils/validation";
import Artwork from "./Artwork";
import {
  Action,
  AppIcon,
  AppText,
  Button,
  ErrorText,
  IconButton,
  MediaTitle,
  MediaSubtitle,
  SearchField,
} from "./UI";
import { ModalPanel } from "./ui/ModalPanel";

export default function SongRow({
  song,
  queue,
  onRemove,
  removeLabel = "Gỡ khỏi playlist",
  onOpen,
  onChanged,
}: {
  song: Song;
  queue?: Song[];
  onRemove?: () => void;
  removeLabel?: string;
  onOpen?: () => void;
  onChanged?: () => void;
}) {
  const { user } = useAuth();
  const data = useLibraryData();
  const player = usePlayerActions();
  const action = useAction();
  const [panel, setPanel] = useState<"actions" | "playlists" | "delete" | null>(
    null,
  );
  const [playlistQuery, setPlaylistQuery] = useState("");
  const [playlistPage, setPlaylistPage] = useState(0);
  const matchingPlaylists =
    panel === "playlists"
      ? data.playlists.filter((playlist) =>
          normalizeSearch(`${playlist.name} ${playlist.description}`).includes(
            normalizeSearch(playlistQuery),
          ),
        )
      : [];
  const currentPlaylistPage = Math.min(
    playlistPage,
    Math.max(0, Math.ceil(matchingPlaylists.length / 10) - 1),
  );
  const [cover, setCover] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const favorites = useFavoriteSong(song.id);
  const favorite = favorites.favorite;
  const error = action.error || favorites.error;
  if (removed) return null;

  return (
    <YStack marginVertical="1.5" minWidth={0}>
      <XStack alignItems="center" gap="2" minWidth={0}>
        <Action
          onPress={() => {
            onOpen?.();
            player.play(song, queue);
          }}
          aria-label={`Phát ${song.title}, ${song.artist}`}
          flex={1}
          flexBasis={0}
          flexShrink={1}
          minWidth={0}
          flexDirection="row"
          alignItems="center"
          gap="3"
        >
          <Artwork uri={cover ?? song.cover} size={70} radius={4} />
          <YStack flex={1} minWidth={0} gap={3}>
            <MediaTitle fontSize={16} lineHeight="22px" fontWeight="700">
              {song.title}
            </MediaTitle>
            <MediaSubtitle fontSize={13} lineHeight="19px">
              {song.artist}
            </MediaSubtitle>
            <AppText variant="caption" fontSize={12} lineHeight="16px">
              {formatDuration(song.durationSeconds)}
            </AppText>
          </YStack>
        </Action>
        <IconButton
          width={44}
          height={44}
          padding={0}
          onPress={() => setPanel("actions")}
          aria-label={`Thao tác với ${song.title}`}
          aria-expanded={panel !== null}
        >
          <AppIcon name="more" color="textMuted" size={22} />
        </IconButton>
      </XStack>
      <ErrorText message={!panel ? error : ""} />
      {panel && (
        <ModalPanel
          open
          onClose={() => {
            if (!action.busy) setPanel(null);
          }}
          title={
            panel === "delete"
              ? "Xóa bài hát?"
              : panel === "playlists"
                ? "Thêm vào Playlist"
                : song.title
          }
          description={
            panel === "delete"
              ? "Bài hát sẽ được gỡ khỏi ứng dụng. Lịch sử và số liệu vẫn được giữ lại. Bạn có chắc chắn muốn tiếp tục không?"
              : panel === "playlists"
                ? song.title
                : ""
          }
        >
          <ErrorText message={error} />
          {panel === "delete" ? (
            <Button
              title="Xóa bài hát"
              variant="danger"
              loading={action.busy}
              onPress={() =>
                void action.run(async () => {
                  await backendDelete(`/songs/${encodeURIComponent(song.id)}`);
                  player.removeSong(song.id);
                  setRemoved(true);
                  setPanel(null);
                  onChanged?.();
                })
              }
            />
          ) : panel === "actions" ? (
            <>
              {onRemove && (
                <Button
                  title={removeLabel}
                  variant="danger"
                  onPress={() => {
                    setPanel(null);
                    onRemove();
                  }}
                />
              )}
              <Button
                title={favorite ? "Bỏ yêu thích" : "Yêu thích"}
                variant="secondary"
                disabled={favorites.disabled}
                loading={favorites.busy}
                onPress={favorites.toggle}
              />
              <Button
                title="Playlist"
                variant="secondary"
                onPress={() => {
                  setPlaylistQuery("");
                  setPlaylistPage(0);
                  setPanel("playlists");
                }}
              />
              <Button
                title="Chi tiết bài hát"
                variant="secondary"
                onPress={() => {
                  onOpen?.();
                  setPanel(null);
                  router.push({ pathname: "/song", params: { id: song.id } });
                }}
              />
              {user?.uid === song.artistId ? (
                <>
                  <Button
                    title="Đổi ảnh bìa"
                    variant="secondary"
                    disabled={action.busy}
                    onPress={() =>
                      void action.run(async () => {
                        const owner = getFirebaseAuth().currentUser;
                        const result =
                          await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ["images"],
                            allowsEditing: true,
                            aspect: [1, 1],
                            quality: 0.85,
                          });
                        if (result.canceled) return;
                        if (!owner || getFirebaseAuth().currentUser !== owner)
                          throw new Error("Phiên đăng nhập đã thay đổi.");
                        const asset = result.assets[0];
                        const uploaded = await uploadMedia(
                          {
                            uri: asset.uri,
                            name: asset.fileName || "song-cover.jpg",
                            mimeType: asset.mimeType || "image/jpeg",
                            size: asset.fileSize,
                            file: asset.file,
                          },
                          "image",
                        );
                        if (getFirebaseAuth().currentUser !== owner)
                          throw new Error("Phiên đăng nhập đã thay đổi.");
                        await backendPatch(
                          `/songs/${encodeURIComponent(song.id)}/cover`,
                          { coverUrl: uploaded.url },
                        );
                        setCover(uploaded.url);
                        setPanel(null);
                        onChanged?.();
                      })
                    }
                  />
                  <Button
                    title="Xóa bài hát"
                    variant="danger"
                    disabled={action.busy}
                    onPress={() => setPanel("delete")}
                  />
                </>
              ) : null}
            </>
          ) : (
            <>
              <SearchField
                value={playlistQuery}
                onChange={(value) => {
                  setPlaylistQuery(value);
                  setPlaylistPage(0);
                }}
                placeholder="Tìm playlist của bạn"
              />
              {matchingPlaylists
                .slice(currentPlaylistPage * 10, (currentPlaylistPage + 1) * 10)
                .map((playlist) => (
                  <Button
                    key={playlist.id}
                    title={
                      playlist.songIds.includes(song.id)
                        ? `${playlist.name} · Gỡ khỏi Playlist`
                        : `${playlist.name} · ${playlist.songIds.length} bài hát`
                    }
                    disabled={action.busy}
                    onPress={() => {
                      if (!user) return;
                      void action.run(async () => {
                        await changePlaylistSong(
                          user.uid,
                          playlist.id,
                          song.id,
                          !playlist.songIds.includes(song.id),
                        );
                        setPanel(null);
                      });
                    }}
                  />
                ))}
              {!data.playlists.length && (
                <Button
                  title="Tạo playlist trước"
                  onPress={() => {
                    setPanel(null);
                    router.push("/playlists");
                  }}
                />
              )}
              {data.playlists.length > 0 && !matchingPlaylists.length ? (
                <AppText>Không tìm thấy playlist.</AppText>
              ) : null}
              {matchingPlaylists.length > 10 ? (
                <XStack gap="2">
                  <Button
                    title="Trang trước"
                    variant="secondary"
                    disabled={action.busy || currentPlaylistPage === 0}
                    onPress={() => setPlaylistPage(currentPlaylistPage - 1)}
                  />
                  <Button
                    title="Trang tiếp"
                    variant="secondary"
                    disabled={
                      action.busy ||
                      (currentPlaylistPage + 1) * 10 >= matchingPlaylists.length
                    }
                    onPress={() => setPlaylistPage(currentPlaylistPage + 1)}
                  />
                </XStack>
              ) : null}
              <Button
                title="Quay lại thao tác"
                variant="secondary"
                onPress={() => setPanel("actions")}
              />
            </>
          )}
        </ModalPanel>
      )}
    </YStack>
  );
}
