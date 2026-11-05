import Guard from "../components/Guard";
import BasicSettingsScreen from "../components/BasicSettingsScreen";
export default function Route() {
  return (
    <Guard>
      <BasicSettingsScreen />
    </Guard>
  );
}
