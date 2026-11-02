import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import SongScreen from "../components/SongScreen";
import { BackButton } from "../components/discovery/BackButton";
import { ErrorText, Page } from "../components/UI";
export default function Route() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  return (
    <Guard>
      {id ? (
        <SongScreen key={id} id={id} />
      ) : (
        <Page title="Bài hát" titleLeading={<BackButton inline />}>
          <ErrorText message="Thiếu ID bài hát." />
        </Page>
      )}
    </Guard>
  );
}
