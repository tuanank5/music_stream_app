import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import SongScreen from "../screens/SongScreen";
import { BackButton } from "../components/ui/BackButton";
import { ErrorText, Page } from "../components/ui/index";
export default function Route() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <RequireAuth>
      {id ? (
        <SongScreen key={id} id={id} />
      ) : (
        <Page title="Bài hát" titleLeading={<BackButton inline />}>
          <ErrorText message="Thiếu ID bài hát." />
        </Page>
      )}
    </RequireAuth>
  );
}
