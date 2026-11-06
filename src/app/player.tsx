import RequireAuth from "../components/RequireAuth";
import PlayerScreen from "../screens/PlayerScreen";

export default function Route() {
  return (
    <RequireAuth>
      <PlayerScreen />
    </RequireAuth>
  );
}
