import { YStack } from "tamagui";
import { useSongDetail } from "../hooks/useSongDetail";
import { SongDetailScreen } from "./DetailScreens";
import { BackButton } from "./discovery/BackButton";
import { ErrorText, Loading, Page } from "./UI";

export default function SongScreen({ id }: { id: string }) {
  const { error, loading } = useSongDetail(id);
  return (
    <YStack flex={1} minHeight={0}>
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
        <SongDetailScreen />
      )}
    </YStack>
  );
}
