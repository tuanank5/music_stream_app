import RequireAuth from "../components/RequireAuth";
import { LyricsScreen } from "../screens/LyricsScreen";
export default function Route() {
  return (
    <RequireAuth>
      <LyricsScreen />
    </RequireAuth>
  );
}
