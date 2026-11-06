import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Share, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScrollView,
  Slider,
  Spinner,
  XStack,
  YStack,
  styled,
  useTheme,
} from "tamagui";
import {
  usePlayerActions,
  usePlayerState,
  usePlayerProgress,
} from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { useBackNavigation } from "../hooks/useBackNavigation";
import { useFavoriteSong } from "../hooks/useFavoriteSong";
import { formatDuration } from "../utils/validation";
import { isLocalDemoAudio } from "../utils/audioSource";
import {
  Action,
  AppIcon,
  AppImage,
  AppText,
  ErrorText,
  IconButton,
  PageTitle,
} from "../components/ui/index";

const BackdropGradient = styled(LinearGradient, {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
});

// Local drag state prevents the audio clock from fighting the user's thumb.
// Only commit the existing player's seek operation after the drag ends.
function PlaybackProgress() {
  const player = {
    ...usePlayerProgress(),
    ...usePlayerActions(),
    loading: usePlayerState().loading,
  };
  const [draft, setDraft] = useState<number | null>(null);
  const duration = Math.max(0, player.duration);
  const position = Math.min(duration, draft ?? player.position);
  return (
    <YStack>
      <Slider
        aria-label="Tua nhạc"
        value={[position]}
        min={0}
        max={Math.max(1, duration)}
        step={1}
        disabled={!duration || player.loading}
        minHeight={44}
        onValueChange={([value]) => setDraft(value)}
        onSlideEnd={(_, value) => {
          void player.seek(value).finally(() => setDraft(null));
        }}
      >
        <Slider.Track backgroundColor="playerTrack" height={4}>
          <Slider.TrackActive backgroundColor="white" />
        </Slider.Track>
        <Slider.Thumb
          index={0}
          aria-label="Vị trí phát"
          width={14}
          height={14}
          borderRadius={7}
          backgroundColor="white"
        />
      </Slider>
      <XStack justifyContent="space-between">
        <AppText variant="caption" color="playerMuted">
          {formatDuration(position)}
        </AppText>
        <AppText variant="caption" color="playerMuted">
          {formatDuration(duration)}
        </AppText>
      </XStack>
    </YStack>
  );
}

export default function PlayerScreen() {
  const closePlayer = useBackNavigation("/home");
  const player = { ...usePlayerState(), ...usePlayerActions() };
  const action = useAction();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const theme = useTheme();
  const [failedCover, setFailedCover] = useState("");
  const song = player.current;
  const favorites = useFavoriteSong(song?.id);
  const favorite = favorites.favorite;

  return (
    <YStack flex={1} backgroundColor="playerBackground">
      {song?.cover && failedCover !== song.cover ? (
        <AppImage
          source={{ uri: song.cover }}
          resizeMode="cover"
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          onError={() => setFailedCover(song.cover)}
        />
      ) : (
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          alignItems="center"
          justifyContent="center"
          opacity={0.12}
        >
          <AppIcon name="waveform" size={160} color="white" />
        </YStack>
      )}
      <BackdropGradient
        colors={["#10161a33", "#10161a99", theme.playerBackground.get()]}
        locations={[0, 0.45, 1]}
      />
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <YStack
          flex={1}
          paddingTop={insets.top + 8}
          paddingBottom={insets.bottom + 24}
          paddingLeft={insets.left + 20}
          paddingRight={insets.right + 20}
        >
          <XStack alignItems="center" justifyContent="space-between" gap="3">
            <AppText color="white" fontWeight="600" flex={1}>
              ĐANG PHÁT
            </AppText>
            <IconButton aria-label="Thu gọn trình phát" onPress={closePlayer}>
              <AppIcon name="collapse" color="white" size={28} />
            </IconButton>
          </XStack>
          <YStack flex={1} minHeight={Math.round(height * 0.28)} />
          {song ? (
            <YStack gap="4">
              <YStack gap="2">
                <PageTitle color="white" marginVertical={0}>
                  {song.title}
                </PageTitle>
                <AppText color="playerMuted" fontSize={16} lineHeight="24px">
                  {song.artist}
                </AppText>
              </YStack>
              <ErrorText
                message={player.error || favorites.error || action.error}
              />
              {player.error ? (
                <Action
                  onPress={() => player.play(song)}
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="playerTrack"
                  borderRadius="pill"
                >
                  <AppText color="white">Thử tải lại bài hát</AppText>
                </Action>
              ) : null}
              <PlaybackProgress key={song.id} />
              <XStack alignItems="center" justifyContent="space-between">
                <IconButton
                  aria-label={player.repeat ? "Tắt lặp một bài" : "Lặp một bài"}
                  aria-pressed={player.repeat}
                  onPress={() => player.setRepeat(!player.repeat)}
                >
                  <AppIcon
                    name="repeat-one"
                    color={player.repeat ? "accent" : "playerMuted"}
                  />
                </IconButton>
                <IconButton aria-label="Bài trước" onPress={player.previous}>
                  <AppIcon name="previous" color="white" size={30} />
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
                  width={76}
                  height={76}
                  borderRadius={38}
                  backgroundColor="white"
                >
                  {player.loading ? (
                    <Spinner color="playerBackground" />
                  ) : (
                    <AppIcon
                      name={player.playing ? "pause" : "play"}
                      color="playerBackground"
                      size={36}
                    />
                  )}
                </IconButton>
                <IconButton aria-label="Bài tiếp theo" onPress={player.next}>
                  <AppIcon name="next" color="white" size={30} />
                </IconButton>
                <IconButton
                  aria-label={favorite ? "Bỏ yêu thích" : "Yêu thích bài hát"}
                  aria-pressed={favorite}
                  disabled={favorites.disabled}
                  onPress={favorites.toggle}
                >
                  <AppIcon
                    name={favorite ? "heart" : "heart-outline"}
                    color={favorite ? "accent" : "white"}
                  />
                </IconButton>
              </XStack>
              <XStack justifyContent="space-between" marginTop="4" gap="3">
                <Action
                  flex={1}
                  alignItems="center"
                  justifyContent="center"
                  gap="2"
                  onPress={() =>
                    router.push({
                      pathname: "/lyrics",
                      params: { id: song.id },
                    })
                  }
                  aria-label="Xem lời bài hát"
                >
                  <AppIcon name="lyrics" color="playerMuted" size={22} />
                  <AppText variant="caption" color="playerMuted">
                    Lời bài hát
                  </AppText>
                </Action>
                <Action
                  flex={1}
                  alignItems="center"
                  justifyContent="center"
                  gap="2"
                  onPress={() =>
                    router.push({ pathname: "/song", params: { id: song.id } })
                  }
                  aria-label="Chi tiết bài hát"
                >
                  <AppIcon name="info" color="playerMuted" size={22} />
                  <AppText variant="caption" color="playerMuted">
                    Chi tiết
                  </AppText>
                </Action>
                <Action
                  flex={1}
                  alignItems="center"
                  justifyContent="center"
                  gap="2"
                  disabled={action.busy}
                  onPress={() =>
                    void action.run(() =>
                      Share.share({
                        message: `${song.title} — ${song.artist}`,
                      }),
                    )
                  }
                  aria-label="Chia sẻ bài hát"
                >
                  <AppIcon name="share-outline" color="playerMuted" size={22} />
                  <AppText variant="caption" color="playerMuted">
                    Chia sẻ
                  </AppText>
                </Action>
              </XStack>
              {isLocalDemoAudio(song.audioUrl) ? (
                <AppText variant="caption" color="playerMuted">
                  Âm thanh tổng hợp demo do ứng dụng cung cấp, không phải bản
                  thu thương mại.
                </AppText>
              ) : null}
            </YStack>
          ) : (
            <YStack gap="4" alignItems="center">
              <PageTitle color="white" textAlign="center">
                Chưa có bài đang phát
              </PageTitle>
              <AppText color="playerMuted" textAlign="center">
                Chọn một bài hát để bắt đầu nghe nhạc.
              </AppText>
              <Action
                onPress={closePlayer}
                padding="4"
                backgroundColor="white"
                borderRadius="pill"
              >
                <AppText color="playerBackground" fontWeight="700">
                  Quay lại chọn bài
                </AppText>
              </Action>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
