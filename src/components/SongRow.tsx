import { router } from "expo-router";
import { useState } from "react";
import { XStack, YStack } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useLibraryData } from "../contexts/DataContext";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { changePlaylistSong } from "../services/libraryService";
import { useFavoriteSong } from "../hooks/useFavoriteSong";
import type { Song } from "../types/domain";
import { formatDuration } from "../utils/validation";
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
} from "./UI";
import { ModalPanel } from "./ui/ModalPanel";

export default function SongRow({
  song,
  queue,
  onRemove,
}: {
  song: Song;
  queue?: Song[];
  onRemove?: () => void;
}) {
  const { user } = useAuth();
  const data = useLibraryData();
  const player = usePlayerActions();
  const action = useAction();
  const [panel, setPanel] = useState<"actions" | "playlists" | null>(null);
  const favorites = useFavoriteSong(song.id);
  const favorite = favorites.favorite;
  const error = action.error || favorites.error;

  return (
    <YStack marginVertical="1.5" minWidth={0}>
      <XStack alignItems="center" gap="2" minWidth={0}>
        <Action
          onPress={() => {
            player.play(song, queue);
            router.push("/player");
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
          <Artwork uri={song.cover} size={70} radius={4} />
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
          onClose={() => setPanel(null)}
          title={panel === "playlists" ? "Thêm vào playlist" : song.title}
          description={panel === "playlists" ? song.title : song.artist}
        >
          <ErrorText message={error} />
          {panel === "actions" ? (
            <>
              <Button
                title={favorite ? "Bỏ yêu thích" : "Thêm vào yêu thích"}
                variant="secondary"
                disabled={favorites.disabled}
                loading={favorites.busy}
                onPress={favorites.toggle}
              />
              <Button
                title="Chi tiết bài hát"
                variant="secondary"
                onPress={() => {
                  setPanel(null);
                  router.push({ pathname: "/song", params: { id: song.id } });
                }}
              />
              <Button
                title="Thêm vào playlist"
                variant="secondary"
                onPress={() => setPanel("playlists")}
              />
              {onRemove && (
                <Button
                  title="Gỡ khỏi playlist"
                  variant="danger"
                  onPress={() => {
                    setPanel(null);
                    onRemove();
                  }}
                />
              )}
            </>
          ) : (
            <>
              {data.playlists.slice(0, 10).map((playlist) => (
                <Button
                  key={playlist.id}
                  title={playlist.name}
                  disabled={action.busy}
                  onPress={() => {
                    if (!user) return;
                    void action.run(async () => {
                      await changePlaylistSong(
                        user.uid,
                        playlist.id,
                        song.id,
                        true,
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
              {data.playlists.length > 10 && (
                <AppText variant="caption">
                  Hiển thị 10 playlist đầu trong hộp chọn.
                </AppText>
              )}
              <Button
                title="Quay lại thao tác"
                variant="secondary"
                onPress={() => setPanel("actions")}
              />
            </>
          )}
          <Button
            title="Đóng"
            variant="secondary"
            onPress={() => setPanel(null)}
          />
        </ModalPanel>
      )}
    </YStack>
  );
}
