import { router } from "expo-router";
import { YStack } from "tamagui";
import { useSongDetail } from "../hooks/useSongDetail";
import { useCatalogData } from "../contexts/DataContext";
import { usePlayerActions } from "../contexts/PlayerContext";
import { formatDuration } from "../utils/validation";
import Artwork from "../components/Artwork";
import SimilarSongsSection from "../components/SimilarSongsSection";
import { BackButton } from "../components/ui/BackButton";
import {
  AppText,
  Button,
  Page,
  SectionTitle,
  ErrorText,
  Loading,
} from "../components/ui/index";
export default function SongScreen({ id }: { id: string }) {
  const { error, loading } = useSongDetail(id);
  return (
    <YStack flex={1} minHeight={0} backgroundColor="background">
      <YStack paddingHorizontal="gutter" paddingTop="2">
        <BackButton />
      </YStack>
      {loading ? (
        <Page>
          <Loading />
        </Page>
      ) : error ? (
        <Page>
          <ErrorText message={error} />
        </Page>
      ) : (
        <SongDetails id={id} />
      )}
    </YStack>
  );
}
function SongDetails({ id }: { id: string }) {
  const data = useCatalogData(),
    player = usePlayerActions();
  const song = data.songs.find((s) => s.id === id && s.active);
  if (!song)
    return (
      <Page title="Song">
        <AppText>Bài hát không còn khả dụng hoặc đang tải.</AppText>
      </Page>
    );
  return (
    <Page title={song.title}>
      <YStack alignItems="center" gap="3" marginBottom="4">
        <Artwork uri={song.cover} size={220} />
        <SectionTitle textAlign="center">{song.artist}</SectionTitle>
      </YStack>
      <AppText variant="muted">
        Album: {song.album || "Chưa có"}
        {"\n"}Thời lượng: {formatDuration(song.durationSeconds)}
      </AppText>
      <Button
        title="Phát bài hát"
        onPress={() => {
          player.play(
            song,
            data.songs.filter((s) => s.active),
          );
        }}
      />
      {song.artistId ? (
        <Button
          title="Xem nghệ sĩ"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/artist",
              params: { id: song.artistId },
            })
          }
        />
      ) : null}
      <Button
        title="Lời bài hát"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: "/lyrics", params: { id: song.id } })
        }
      />
      {song.isPublic ? (
        <SimilarSongsSection key={song.id} songId={song.id} />
      ) : null}
    </Page>
  );
}
