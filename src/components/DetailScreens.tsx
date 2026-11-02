import { router, useLocalSearchParams } from "expo-router";
import { YStack } from "tamagui";
import { BackButton } from "./discovery/BackButton";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { formatDuration } from "../utils/validation";
import Artwork from "./Artwork";
import { AppText, Button, Page, SectionTitle } from "./UI";
export function SongDetailScreen() {
  const { id } = useLocalSearchParams<{
      id: string;
    }>(),
    data = useData(),
    player = usePlayer();
  const song = data.songs.find((s) => s.id === id && s.active);
  if (!song)
    return (
      <Page title="Song">
        <AppText>Bài hát không còn khả dụng hoặc đang tải.</AppText>
      </Page>
    );
  return (
    <Page title={song.title}>
      <YStack alignItems="center" gap="3" marginBottom="4">
        <Artwork uri={song.cover} size={220} />
        <SectionTitle textAlign="center">{song.artist}</SectionTitle>
      </YStack>
      <AppText variant="muted">
        Album: {song.album || "Chưa có"}
        {"\n"}Thời lượng dự kiến: {formatDuration(song.durationSeconds)}
      </AppText>
      <Button
        title="Phát bài hát"
        onPress={() => {
          player.play(
            song,
            data.songs.filter((s) => s.active),
          );
          router.push("/player");
        }}
      />
      {song.artistId ? (
        <Button
          title="Xem nghệ sĩ"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/artist",
              params: { id: song.artistId },
            })
          }
        />
      ) : null}
      <Button
        title="Lời bài hát"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: "/lyrics", params: { id: song.id } })
        }
      />
    </Page>
  );
}
export function LyricsScreen() {
  const { id } = useLocalSearchParams<{
      id: string;
    }>(),
    data = useData();
  const song = data.songs.find((s) => s.id === id && s.active);
  return (
    <Page
      title="Lời bài hát"
      titleLeading={<BackButton inline />}
      contentWidth="reading"
    >
      <SectionTitle>{song?.title ?? "Không tìm thấy bài hát"}</SectionTitle>
      <AppText variant="muted" userSelect="text" lineHeight="29px">
        {song?.lyrics || "Chưa có lời bài hát cho bài này."}
      </AppText>
    </Page>
  );
}
export function PremiumScreen() {
  return (
    <Page title="Premium — giao diện giới thiệu">
      <AppText variant="muted">
        Phiên bản học tập này không có thanh toán, gói thuê bao hoặc tải
        offline. Bạn không cần mua Premium để sử dụng các chức năng MVP.
      </AppText>
      <Button
        title="Tiếp tục nghe nhạc"
        onPress={() => router.replace("/home")}
      />
    </Page>
  );
}
