import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import AlbumScreen from "../components/AlbumScreen";
import { BackButton } from "../components/discovery/BackButton";
import { ErrorText, Page } from "../components/UI";
export default function Route() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <Guard>
      {id ? (
        <AlbumScreen id={id} />
      ) : (
        <Page title="Album" titleLeading={<BackButton inline />}>
          <ErrorText message="Thiếu ID album." />
        </Page>
      )}
    </Guard>
  );
}
