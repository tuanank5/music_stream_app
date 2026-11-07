import { useLocalSearchParams } from "expo-router";

import { BackButton } from "../components/ui/BackButton";
import { useBackendResource } from "../hooks/useBackendResource";
import type { Song } from "../types/domain";

import {
  AppText,
  Button,
  ErrorText,
  Loading,
  Page,
  SectionTitle,
} from "../components/ui/index";

export function LyricsScreen() {
  const { id } = useLocalSearchParams<{
    id: string;
  }>();
  const state = useBackendResource<Song>(
    `/songs/${encodeURIComponent(id || "missing")}`,
  );
  const song = state.value;
  return (
    <Page
      title="Lời bài hát"
      titleLeading={<BackButton inline />}
      contentWidth="reading"
    >
      {state.loading ? <Loading /> : null}
      <ErrorText message={state.error} />
      {state.error ? (
        <Button
          title="Thử tải lại lời bài hát"
          variant="secondary"
          onPress={state.refresh}
        />
      ) : null}
      {song ? (
        <>
          <SectionTitle>{song.title}</SectionTitle>
          <AppText variant="muted" userSelect="text" lineHeight="29px">
            {song?.lyrics || "Chưa có lời bài hát cho bài này."}
          </AppText>
        </>
      ) : null}
    </Page>
  );
}
