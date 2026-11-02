import { router } from "expo-router";
import type { ReactNode } from "react";
import { useWindowDimensions } from "react-native";
import { ScrollView, XStack, YStack } from "tamagui";
import { usePlayerActions } from "../contexts/PlayerContext";
import { useCharts } from "../hooks/useCharts";
import type { useHomeDiscovery } from "../hooks/useHomeDiscovery";
import { uiSpacing } from "../../tamagui.config";
import Artwork from "./Artwork";
import { MediaCoverCard } from "./MediaCoverCard";
import { ArtistCard, ChartCard } from "./discovery/DiscoveryCards";
import {
  Action,
  MediaTitle,
  MediaSubtitle,
  EmptyState,
  ErrorText,
  Loading,
  SectionHeading,
} from "./UI";

function Section({
  title,
  onPress,
  children,
}: {
  title: string;
  onPress?: () => void;
  children: ReactNode;
}) {
  return (
    <YStack>
      <YStack paddingHorizontal="gutter">
        <SectionHeading title={title} onPress={onPress} />
      </YStack>
      {children}
    </YStack>
  );
}

function Rail({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: uiSpacing.gutter }}
    >
      <XStack gap="cardGap" alignItems="flex-start">
        {children}
      </XStack>
    </ScrollView>
  );
}

function SectionState({
  loading,
  empty,
  message,
  children,
}: {
  loading: boolean;
  empty: boolean;
  message: string;
  children: ReactNode;
}) {
  if (loading) return <Loading />;
  if (empty)
    return (
      <YStack paddingHorizontal="gutter">
        <EmptyState message={message} />
      </YStack>
    );
  return <>{children}</>;
}

export default function HomeDiscovery({
  state,
}: {
  state: ReturnType<typeof useHomeDiscovery>;
}) {
  const player = usePlayerActions();
  const charts = useCharts();
  const { width } = useWindowDimensions();
  const portraitWidth = Math.round(width * 0.58);
  const coverSize = Math.round(width * 0.35);
  const { suggestions, albums, artists, loading, errors } = state;
  const songError = errors.some((error) => error.startsWith("Songs:"));
  const albumError =
    songError || errors.some((error) => error.startsWith("Albums:"));
  const artistError =
    songError || errors.some((error) => error.startsWith("Artists:"));

  return (
    <>
      <YStack paddingHorizontal="gutter">
        {errors.map((error) => (
          <ErrorText key={error} message={error} />
        ))}
      </YStack>
      <Section title="Suggestions for you">
        <SectionState
          loading={loading}
          empty={!suggestions.length}
          message={
            songError
              ? "Chưa thể tải gợi ý. Vui lòng kiểm tra kết nối."
              : "Chưa có bài hát để gợi ý cho bạn."
          }
        >
          <Rail>
            {suggestions.map((song) => (
              <MediaCoverCard
                key={song.id}
                cover={song.cover}
                title={song.title}
                subtitle={song.artist}
                height={Math.round(portraitWidth * 1.33)}
                onPress={() => {
                  player.play(song, suggestions);
                  router.push("/player");
                }}
                width={portraitWidth}
              />
            ))}
          </Rail>
        </SectionState>
      </Section>

      <Section title="Charts" onPress={() => router.push("/charts")}>
        <SectionState
          loading={charts.loading}
          empty={!charts.charts.length}
          message={
            charts.error
              ? "Chưa thể tải bảng xếp hạng."
              : "Chưa có bài hát công khai để tạo bảng xếp hạng."
          }
        >
          <Rail>
            {charts.charts.map((chart) => (
              <ChartCard
                key={chart.id}
                chart={chart}
                size={coverSize}
                spacing={0}
              />
            ))}
          </Rail>
        </SectionState>
      </Section>

      <Section title="Trending albums" onPress={() => router.push("/albums")}>
        <SectionState
          loading={loading}
          empty={!albums.length}
          message={
            albumError ? "Chưa thể tải album." : "Chưa có album được phát hành."
          }
        >
          <Rail>
            {albums.map((album) => (
              <Action
                key={album.id}
                aria-label={`Mở album ${album.title}, ${album.artistName}`}
                onPress={() =>
                  router.push({ pathname: "/album", params: { id: album.id } })
                }
                width={coverSize}
              >
                <Artwork uri={album.coverUrl} size={coverSize} radius={4} />
                <MediaTitle marginTop="2">{album.title}</MediaTitle>
                <MediaSubtitle marginTop="1">{album.artistName}</MediaSubtitle>
              </Action>
            ))}
          </Rail>
        </SectionState>
      </Section>

      <Section title="Popular artists" onPress={() => router.push("/artists")}>
        <SectionState
          loading={loading}
          empty={!artists.length}
          message={
            artistError
              ? "Chưa thể tải nghệ sĩ."
              : "Chưa có nghệ sĩ có bài hát công khai."
          }
        >
          <Rail>
            {artists.map((artist) => (
              <ArtistCard
                key={artist.id}
                artist={artist}
                size={coverSize}
                spacing={0}
              />
            ))}
          </Rail>
        </SectionState>
      </Section>
    </>
  );
}
