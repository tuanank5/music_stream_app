import RequireAuth from "../components/RequireAuth";
import HistoryScreen from "../screens/HistoryScreen";

export default function Route() {
  return (
    <RequireAuth>
      <HistoryScreen />
    </RequireAuth>
  );
}
