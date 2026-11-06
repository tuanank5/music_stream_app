import { useLocalSearchParams } from "expo-router";

import { BackButton } from "../components/ui/BackButton";
import { useCatalogData } from "../contexts/DataContext";

import { AppText, Page, SectionTitle } from "../components/ui/index";

export function LyricsScreen() {
  const { id } = useLocalSearchParams<{
      id: string;
    }>(),
    data = useCatalogData();
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
