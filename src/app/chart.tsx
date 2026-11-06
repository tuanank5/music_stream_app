import RequireAuth from "../components/RequireAuth";
import { ChartScreen } from "../screens/ChartScreen";

export default function Route() {
  return (
    <RequireAuth>
      <ChartScreen />
    </RequireAuth>
  );
}
