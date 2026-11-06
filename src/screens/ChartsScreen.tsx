import { useWindowDimensions } from "react-native";
import { XStack } from "tamagui";

import { useCharts } from "../hooks/useCharts";

import { AppText, ErrorText, Loading, Page } from "../components/ui/index";
import { BackButton } from "../components/ui/BackButton";
import { ChartCard } from "../components/discovery/ChartCard";

export function ChartsScreen() {
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
