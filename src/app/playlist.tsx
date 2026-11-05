import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import BackendPlaylistScreen from "../components/BackendPlaylistScreen";
export default function Route() {
  const { id, ownerId } = useLocalSearchParams<{
    id?: string;
    ownerId?: string;
  }>();
  return (
    <Guard>
      <BackendPlaylistScreen
        key={`${ownerId}:${id}`}
        id={id || ""}
        ownerId={ownerId}
      />
    </Guard>
  );
}
