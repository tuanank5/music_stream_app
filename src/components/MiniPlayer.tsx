import { router } from "expo-router";
import { Spinner, XStack, YStack } from "tamagui";
import { usePlayer } from "../contexts/PlayerContext";
import { useFavoriteSong } from "../hooks/useFavoriteSong";
import Artwork from "./Artwork";
import {
  Action,
  AppIcon,
  ErrorText,
  IconButton,
  MediaTitle,
  MediaSubtitle,
} from "./UI";

export default function MiniPlayer() {
  const player = usePlayer();
  const song = player.current;
  const favorites = useFavoriteSong(song?.id);
  if (!song) return null;
  const favorite = favorites.favorite;

  return (
    <YStack
      backgroundColor="playerBackground"
      flexShrink={0}
      position="relative"
      zIndex={1}
    >
      <XStack
        paddingHorizontal="3"
        paddingVertical="2"
        alignItems="center"
        gap="2"
      >
        <Action
          onPress={() => router.push("/player")}
          aria-label={`Mở trình phát: ${song.title}, ${song.artist}`}
          flex={1}
          flexShrink={1}
          minWidth={0}
          flexDirection="row"
          alignItems="center"
          gap="3"
        >
          <Artwork uri={song.cover} size={48} radius={4} />
          <YStack flex={1} minWidth={0}>
            <MediaTitle color="white">{song.title}</MediaTitle>
            <MediaSubtitle color="playerMuted">{song.artist}</MediaSubtitle>
          </YStack>
        </Action>
        <IconButton
          aria-label={favorite ? "Bỏ yêu thích" : "Yêu thích bài hát"}
          aria-pressed={favorite}
          disabled={favorites.disabled}
          onPress={favorites.toggle}
        >
          <AppIcon
            name={favorite ? "heart" : "heart-outline"}
            color={favorite ? "accent" : "white"}
            size={22}
          />
        </IconButton>
        <IconButton
          aria-label={
            player.loading
              ? "Đang tải nhạc"
              : player.playing
                ? "Tạm dừng"
                : "Phát nhạc"
          }
          disabled={player.loading}
          onPress={player.toggle}
        >
          {player.loading ? (
            <Spinner color="white" />
          ) : (
            <AppIcon
              name={player.playing ? "pause" : "play"}
              color="white"
              size={26}
            />
          )}
        </IconButton>
      </XStack>
      <ErrorText message={favorites.error} />
    </YStack>
  );
}
