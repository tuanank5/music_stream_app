import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import AlbumScreen from "../screens/AlbumScreen";
import { BackButton } from "../components/ui/BackButton";
import { ErrorText, Page } from "../components/ui/index";
export default function Route() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    owned?: string;
  }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <RequireAuth>
      {id ? (
        <AlbumScreen id={id} owned={params.owned === "1"} />
      ) : (
        <Page title="Album" titleLeading={<BackButton inline />}>
          <ErrorText message="Thiếu ID album." />
        </Page>
      )}
    </RequireAuth>
  );
}
