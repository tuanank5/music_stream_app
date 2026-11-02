import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { YStack, styled } from "tamagui";
import type { ChartTheme, MusicChart } from "../../types/discovery";
import { AppImage, AppText } from "../UI";
const CoverGradient = styled(LinearGradient, {
  displayName: "CoverGradient",
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: "2",
});
const palettes: Record<ChartTheme, readonly [string, string, string]> = {
  violet: ["#ffe7a1", "#8d3df1", "#4311a5"],
  cyan: ["#bef7f1", "#36c7e5", "#267bd4"],
  pink: ["#ffd4b3", "#eb77bb", "#9254cf"],
};
// Bìa chart: dùng ảnh nếu có, nếu không dùng gradient.
export function ChartCover({
  chart,
  size = 144,
}: {
  chart: MusicChart;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState("");
  return (
    <YStack
      width={size}
      height={size}
      flexShrink={0}
      borderRadius={4}
      overflow="hidden"
    >
      <CoverGradient
        width="100%"
        colors={palettes[chart.theme]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <YStack
          position="absolute"
          width={size * 1.5}
          height={size * 0.4}
          top={-size * 0.04}
          backgroundColor="gloss"
          transform={[{ rotate: "-25deg" }]}
        />

        <AppText
          numberOfLines={2}
          ellipsizeMode="tail"
          fontSize={size * 0.19}
          lineHeight={`${Math.round(size * 0.25)}px`}
          width="100%"
          fontWeight="900"
          color="white"
          textAlign="center"
        >
          {chart.title}
        </AppText>

        <AppText
          numberOfLines={2}
          ellipsizeMode="tail"
          fontSize={size * 0.09}
          lineHeight={`${Math.round(size * 0.14)}px`}
          width="100%"
          textAlign="center"
          color="white"
          marginTop="2.5"
        >
          {chart.subtitle}
        </AppText>
      </CoverGradient>

      {chart.coverUrl && failedUri !== chart.coverUrl ? (
        <AppImage
          source={{ uri: chart.coverUrl }}
          position="absolute"
          width={size}
          height={size}
          onError={() => setFailedUri(chart.coverUrl)}
        />
      ) : null}
    </YStack>
  );
}
