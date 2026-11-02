import { router, useLocalSearchParams } from "expo-router";
import { Share, useWindowDimensions } from "react-native";
import { XStack, YStack } from "tamagui";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { useCharts } from "../hooks/useCharts";
import { chartSongs, shuffleSongs } from "../utils/discovery";
import SongRow from "./SongRow";
import {
  Action,
  AppIcon,
  AppText,
  ErrorText,
  IconButton,
  Loading,
  Page,
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
        Top 50 bài hát theo từng genre, sắp xếp bằng lượt nghe tích lũy.
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
    data = useData(),
    player = usePlayer(),
    action = useAction();
  const chart = state.charts.find((c) => c.id === id);
  if (!chart)
    return (
      <Page title="Chart">
        <BackButton fallback="/charts" />
        <ErrorText message={state.error} />
        {state.loading ? (
          <Loading />
        ) : (
          <AppText variant="muted">Chart không tồn tại hoặc đã bị ẩn.</AppText>
        )}
      </Page>
    );
  const songs = chartSongs(data.songs, chart);
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
      router.push("/player");
    }
  }
  return (
    <Page contentWidth="reading">
      <BackButton fallback="/charts" />

      <XStack gap="4.5" alignItems="center">
        <ChartCover chart={chart} size={Math.round(width * 0.35)} />

        <YStack flex={1} minWidth={0}>
          <SectionTitle marginVertical={0}>
            {chart.title}
            {chart.subtitle ? ` – ${chart.subtitle}` : ""}
          </SectionTitle>
          <XStack alignItems="center" gap="1.5" marginTop={9} flexWrap="wrap">
            <AppIcon name="musical-notes-outline" color="accent" size={16} />
            <AppText variant="muted">
              {songs.length} bài · {totalTime(duration)}
            </AppText>
          </XStack>
          <AppText variant="muted" marginTop="1.5">
            {chart.description || "Danh sách do quản trị viên tuyển chọn."}
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
      <ErrorText message={action.error} />
      {data.loading ? (
        <Loading />
      ) : (
        songs.map((song) => <SongRow key={song.id} song={song} queue={songs} />)
      )}
      {!data.loading && !songs.length ? (
        <AppText variant="muted">
          Chart chưa có bài khả dụng. songIds phải chứa đúng ID document trong
          songs.
        </AppText>
      ) : null}
      {!data.loading && unavailable > 0 ? (
        <AppText variant="muted" marginTop="4">
          {unavailable} bài đã bị ẩn, bị xóa hoặc chưa nằm trong dữ liệu ứng
          dụng tải được.
        </AppText>
      ) : null}
      <AppText variant="muted" marginTop="5">
        Xếp hạng theo lượt nghe tích lũy của bài hát trong từng genre. Một lượt
        nghe được ghi nhận sau ít nhất 60 giây nghe thực tế trong ứng dụng.
      </AppText>
    </Page>
  );
}
