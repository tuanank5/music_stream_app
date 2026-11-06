import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import AlbumAddSongsScreen from "../screens/AlbumAddSongsScreen";
import { ErrorText, Page } from "../components/ui/index";
export default function Route() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return (
    <RequireAuth>
      {id ? (
        <AlbumAddSongsScreen key={id} id={id} />
      ) : (
        <Page title="Thêm bài hát">
          <ErrorText message="Thiếu ID album." />
        </Page>
      )}
    </RequireAuth>
  );
}
