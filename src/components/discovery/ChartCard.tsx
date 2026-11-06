import { router } from "expo-router";
import type { MusicChart } from "../../types/discovery";
import { Action, MediaSubtitle } from "../ui/index";
import { ChartCover } from "./ChartCover";
// Thẻ chart trên Home và trang Charts.
export function ChartCard({
  chart,
  size = 144,
  spacing = 14,
}: {
  chart: MusicChart;
  size?: number;
  spacing?: number;
}) {
  return (
    <Action
      role="button"
      aria-label={`Mở chart ${chart.title} ${chart.subtitle}`}
      onPress={() =>
        router.push({
          pathname: "/chart",
          params: { id: chart.id },
        })
      }
      width={size}
      marginRight={spacing}
    >
      <ChartCover chart={chart} size={size} />

      <MediaSubtitle marginTop="2" numberOfLines={2} ellipsizeMode="tail">
        {chart.description || "Danh sách được tuyển chọn"}
      </MediaSubtitle>
    </Action>
  );
}
