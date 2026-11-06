import RequireAuth from "../components/RequireAuth";
import DiscoveryListScreen from "../screens/DiscoveryListScreen";

export default function Route() {
  return (
    <RequireAuth>
      <DiscoveryListScreen kind="albums" />
    </RequireAuth>
  );
}
