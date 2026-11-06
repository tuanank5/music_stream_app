import RequireAuth from "../components/RequireAuth";
import { ChartsScreen } from "../screens/ChartsScreen";

export default function Route() {
  return (
    <RequireAuth>
      <ChartsScreen />
    </RequireAuth>
  );
}
