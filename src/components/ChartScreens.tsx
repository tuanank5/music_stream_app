import React from "react";
import { Pressable, Share, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCharts } from "../hooks/useCharts";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { useAction } from "../hooks/useAction";
import { chartSongs, shuffleSongs } from "../utils/discovery";
import { Page, Loading, ErrorText } from "./UI";
import SongRow from "./SongRow";
import {
  BackButton,
  ChartCard,
  ChartCover,
  discoveryStyles as ds,
} from "./discovery/DiscoveryCards";
function totalTime(seconds: number) {
  const h = Math.floor(seconds / 3600),
    m = Math.floor((seconds % 3600) / 60);
  return h
    ? `${h} giờ ${m} phút`
    : `${m} phút ${Math.floor(seconds % 60)} giây`;
}
export function ChartsListScreen() {
  const state = useCharts();
  return (
    <Page>
      <View style={ds.content}>
        <BackButton />
        <Text style={ds.title}>Charts</Text>
        <Text style={[ds.muted, { marginTop: 8, marginBottom: 20 }]}>
          Top 50 bài hát theo từng genre, sắp xếp bằng lượt nghe tích lũy.
        </Text>
        <ErrorText message={state.error} />
        {state.loading ? (
          <Loading />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
            {state.charts.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </View>
        )}
        {!state.loading && !state.error && !state.charts.length ? (
          <Text style={ds.muted}>
            Chưa có bài hát công khai để tạo bảng xếp hạng theo genre.
          </Text>
        ) : null}
      </View>
    </Page>
  );
}
export function ChartDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const state = useCharts(),
    data = useData(),
    player = usePlayer(),
    action = useAction();
  const chart = state.charts.find((c) => c.id === id);
  if (!chart)
    return (
      <Page title="Chart">
        <View style={ds.content}>
          <BackButton fallback="/charts" />
          <ErrorText message={state.error} />
          {state.loading ? (
            <Loading />
          ) : (
            <Text style={ds.muted}>Chart không tồn tại hoặc đã bị ẩn.</Text>
          )}
        </View>
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
    <Page>
      <View style={[ds.content, { maxWidth: 820 }]}>
        <BackButton fallback="/charts" />

        <View
          style={{
            flexDirection: "row",
            gap: 18,
            alignItems: "center",
          }}
        >
          <ChartCover chart={chart} size={116} />

          <View style={{ flex: 1 }}>
            <Text style={[ds.title, { fontSize: 23 }]}>
              {chart.title}
              {chart.subtitle ? ` – ${chart.subtitle}` : ""}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginTop: 9,
                flexWrap: "wrap",
              }}
            >
              <Ionicons
                name="musical-notes-outline"
                color="#00bcd4"
                size={16}
              />
              <Text style={ds.muted}>
                {songs.length} bài · {totalTime(duration)}
              </Text>
            </View>
            <Text style={[ds.muted, { marginTop: 6 }]}>
              {chart.description || "Danh sách do quản trị viên tuyển chọn."}
            </Text>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 22,
            marginBottom: 18,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chia sẻ thông tin chart"
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
            style={{ padding: 8 }}
          >
            <Ionicons name="share-outline" size={23} color="#737b87" />
          </Pressable>
          <View style={{ flexDirection: "row", gap: 20, alignItems: "center" }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phát ngẫu nhiên chart"
              disabled={!songs.length}
              onPress={() => play(true)}
              style={{ padding: 8, opacity: songs.length ? 1 : 0.35 }}
            >
              <Ionicons name="shuffle" size={26} color="#737b87" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Phát tất cả bài trong chart"
              disabled={!songs.length}
              onPress={() => play()}
              style={[ds.roundPlay, { opacity: songs.length ? 1 : 0.35 }]}
            >
              <Ionicons
                name="play"
                size={25}
                color="white"
                style={{ marginLeft: 3 }}
              />
            </Pressable>
          </View>
        </View>
        <ErrorText message={action.error} />
        {data.loading ? (
          <Loading />
        ) : (
          songs.map((song, index) => (
            <View
              key={song.id}
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Text
                style={{
                  width: 20,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#a0a6af",
                }}
              >
                {index + 1}
              </Text>
              <View style={{ flex: 1 }}>
                <SongRow song={song} queue={songs} />
              </View>
            </View>
          ))
        )}
        {!data.loading && !songs.length ? (
          <Text style={ds.muted}>
            Chart chưa có bài khả dụng. songIds phải chứa đúng ID document trong
            songs.
          </Text>
        ) : null}
        {!data.loading && unavailable > 0 ? (
          <Text style={[ds.muted, { marginTop: 16 }]}>
            {unavailable} bài đã bị ẩn, bị xóa hoặc chưa nằm trong dữ liệu ứng
            dụng tải được.
          </Text>
        ) : null}
        <Text style={[ds.muted, { fontSize: 11, marginTop: 20 }]}>
          Xếp hạng theo lượt nghe tích lũy của bài hát trong từng genre.
          Một lượt nghe được ghi nhận sau ít nhất 60 giây nghe thực tế
          trong ứng dụng.
        </Text>
      </View>
    </Page>
  );
}