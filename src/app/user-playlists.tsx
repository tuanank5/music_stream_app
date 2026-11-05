import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import UserPlaylistsScreen from "../components/UserPlaylists";
export default function Route() {
  const { ownerId } = useLocalSearchParams<{ ownerId?: string }>();
  return (
    <Guard>
      <UserPlaylistsScreen ownerId={ownerId || ""} />
    </Guard>
  );
}
