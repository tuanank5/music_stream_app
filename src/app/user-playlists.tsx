import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import UserPlaylistsScreen from "../screens/UserPlaylistsScreen";
export default function Route() {
  const { ownerId } = useLocalSearchParams<{ ownerId?: string }>();
  return (
    <RequireAuth>
      <UserPlaylistsScreen ownerId={ownerId || ""} />
    </RequireAuth>
  );
}
