import RequireAuth from "../components/RequireAuth";
import BasicSettingsScreen from "../screens/BasicSettingsScreen";
export default function Route() {
  return (
    <RequireAuth>
      <BasicSettingsScreen />
    </RequireAuth>
  );
}
