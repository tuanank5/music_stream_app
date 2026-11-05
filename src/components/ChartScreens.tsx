import { useLocalSearchParams } from "expo-router";
import { Share, useWindowDimensions } from "react-native";
import { XStack, YStack } from "tamagui";
import {
  useBackendResource,
  useDiscoverySeed,
} from "../hooks/useBackendResource";
import type { Song } from "../types/domain";
import type { MusicChart } from "../types/discovery";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { useCharts } from "../hooks/useCharts";
import { shuffleSongs } from "../utils/discovery";
import SongRow from "./SongRow";
import {
  Action,
  AppIcon,
  AppText,
  ErrorText,
  IconButton,
  Loading,
  Page,
  ListPage,
  SectionTitle,
} from "./UI";
import { BackButton, ChartCard, ChartCover } from "./discovery/DiscoveryCards";
function totalTime(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60);
  return h
    ? `${h} giờ ${m} phút`
    : `${m} phút ${Math.floor(seconds % 60)} giây`;
}
export function ChartsListScreen() {
  const state = useCharts();
  const { width } = useWindowDimensions();
  const cardSize = Math.floor((width - 60) / 2);
  return (
    <Page title="Charts" titleLeading={<BackButton inline />}>
      <AppText variant="muted" marginTop="2" marginBottom="5">
        Tuyển Top 50 theo lượt nghe tích lũy trong từng genre, rồi trộn thứ tự
        khám phá.
      </AppText>
      <ErrorText message={state.error} />
      {state.loading ? (
        <Loading />
      ) : (
        <XStack flexWrap="wrap" gap="5">
          {state.charts.map((chart) => (
            <ChartCard
              key={chart.id}
              chart={chart}
              size={cardSize}
              spacing={0}
            />
          ))}
        </XStack>
      )}
      {!state.loading && !state.error && !state.charts.length ? (
        <AppText variant="muted">
          Chưa có bài hát công khai để tạo bảng xếp hạng theo genre.
        </AppText>
      ) : null}
    </Page>
  );
}
export function ChartDetailScreen() {
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{
    id?: string | string[];
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const state = useCharts(),
    player = usePlayerActions(),
    action = useAction();
  const seed = useDiscoverySeed();
  const detail = useBackendResource<{
    songs: Song[];
    chart: MusicChart | null;
  }>("/collection", { chartId: id ?? "", seed });
  const chart = detail.value?.chart ?? state.charts.find((c) => c.id === id);
  if (!chart)
    return (
      <Page title="Chart">
        <BackButton fallback="/charts" />
        <ErrorText message={state.error || detail.error} />
        {state.loading || detail.loading ? (
          <Loading />
        ) : (
          <AppText variant="muted">Chart không tồn tại hoặc đã bị ẩn.</AppText>
        )}
      </Page>
    );
  const songs = detail.value?.songs ?? [];
  const unavailable = new Set(chart.songIds).size - songs.length;
  const duration = songs.reduce(
    (sum, s) =>
      sum +
      (Number.isFinite(s.durationSeconds) ? Math.max(0, s.durationSeconds) : 0),
    0,
  );
  function play(shuffle = false) {
    const queue = shuffle ? shuffleSongs(songs) : songs;
    if (queue.length) {
      player.play(queue[0], queue);
    }
  }
  return (
    <ListPage
      contentWidth="reading"
      data={songs}
      keyExtractor={(song) => song.id}
      renderItem={(song) => <SongRow song={song} queue={songs} />}
      header={
        <>
          <BackButton fallback="/charts" />

          <XStack gap="4.5" alignItems="center">
            <ChartCover chart={chart} size={Math.round(width * 0.35)} />

            <YStack flex={1} minWidth={0}>
              <SectionTitle marginVertical={0}>
                {chart.title}
                {chart.subtitle ? ` – ${chart.subtitle}` : ""}
              </SectionTitle>
              <XStack
                alignItems="center"
                gap="1.5"
                marginTop={9}
                flexWrap="wrap"
              >
                <AppIcon
                  name="musical-notes-outline"
                  color="accent"
                  size={16}
                />
                <AppText variant="muted">
                  {songs.length} bài · {totalTime(duration)}
                </AppText>
              </XStack>
              <AppText variant="muted" marginTop="1.5">
                {chart.description || "Danh sách nhạc được tuyển chọn."}
              </AppText>
            </YStack>
          </XStack>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            marginTop="5.5"
            marginBottom="4.5"
          >
            <Action
              role="button"
              aria-label="Chia sẻ thông tin chart"
              onPress={() =>
                void action.run(async () => {
                  await Share.share({
                    message: `${chart?.title} ${chart?.subtitle}\n${songs
                      .slice(0, 5)
                      .map((s) => `${s.title} — ${s.artist}`)
                      .join("\n")}`,
                  });
                })
              }
              padding="2"
            >
              <AppIcon name="share-outline" size={23} color="textMuted" />
            </Action>
            <XStack gap="5" alignItems="center">
              <Action
                role="button"
                aria-label="Phát ngẫu nhiên chart"
                disabled={!songs.length}
                onPress={() => play(true)}
                padding="2"
                opacity={songs.length ? 1 : 0.35}
              >
                <AppIcon name="shuffle" size={26} color="textMuted" />
              </Action>
              <IconButton
                tone="play"
                role="button"
                aria-label="Phát tất cả bài trong chart"
                disabled={!songs.length}
                onPress={() => play()}
                width={52}
                height={52}
                borderRadius={26}
                backgroundColor="contrast"
                alignItems="center"
                justifyContent="center"
                opacity={songs.length ? 1 : 0.35}
              >
                <AppIcon name="play" size={25} color="white" />
              </IconButton>
            </XStack>
          </XStack>
          <ErrorText message={action.error || detail.error} />
          {detail.loading && <Loading />}
          {!detail.loading && unavailable > 0 && (
            <AppText variant="muted">
              {unavailable} bài không còn khả dụng.
            </AppText>
          )}
        </>
      }
    />
  );
}
