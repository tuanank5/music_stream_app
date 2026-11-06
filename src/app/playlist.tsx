import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import PlaylistScreen from "../screens/PlaylistScreen";
export default function Route() {
  const { id, ownerId } = useLocalSearchParams<{
    id?: string;
    ownerId?: string;
  }>();
  return (
    <RequireAuth>
      <PlaylistScreen
        key={`${ownerId}:${id}`}
        id={id || ""}
        ownerId={ownerId}
      />
    </RequireAuth>
  );
}
