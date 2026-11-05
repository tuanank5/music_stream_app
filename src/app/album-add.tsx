import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import AlbumAddSongsScreen from "../components/AlbumAddSongsScreen";
import { ErrorText, Page } from "../components/UI";
export default function Route() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <Guard>
      {id ? (
        <AlbumAddSongsScreen key={id} id={id} />
      ) : (
        <Page title="Thêm bài hát">
          <ErrorText message="Thiếu ID album." />
        </Page>
      )}
    </Guard>
  );
}
