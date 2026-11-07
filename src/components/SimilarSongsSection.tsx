import { YStack } from "tamagui";
import { useBackendResource } from "../hooks/useBackendResource";
import type { Song } from "../types/domain";
import SongRow from "./SongRow";
import { AppText, Button, ErrorText, Loading } from "./ui/index";

export default function SimilarSongsSection({ songId }: { songId: string }) {
  const state = useBackendResource<{
    songs: Song[];
    mode: "metadata" | "hybrid";
  }>("/similar-songs", { id: songId });
  const songs = state.value?.songs || [];
  if (!state.loading && !state.error && !songs.length) return null;
  return (
    <YStack gap="2" marginTop="5">
      <AppText fontWeight="700">Bài hát gợi ý</AppText>
      {state.loading ? <Loading /> : null}
      <ErrorText message={state.error} />
      {state.error ? (
        <Button
          title="Thử tải lại gợi ý"
          variant="secondary"
          onPress={state.refresh}
        />
      ) : null}
      {songs.length ? (
        <AppText variant="caption">
          {state.value?.mode === "hybrid"
            ? "Gợi ý theo độ tương tự thông tin và thể loại bài hát."
            : "Gợi ý theo thể loại, nghệ sĩ và lượt nghe."}
        </AppText>
      ) : null}
      {songs.map((song) => (
        <SongRow key={song.id} song={song} queue={songs} />
      ))}
    </YStack>
  );
}
