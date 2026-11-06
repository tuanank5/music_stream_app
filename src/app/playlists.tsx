import RequireAuth from "../components/RequireAuth";
import { PlaylistsScreen } from "../screens/PlaylistsScreen";
export default function Route() {
  return (
    <RequireAuth>
      <PlaylistsScreen />
    </RequireAuth>
  );
}
