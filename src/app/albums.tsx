import Guard from "../components/Guard";
import DiscoveryListScreen from "../components/DiscoveryListScreen";

export default function Route() {
  return (
    <Guard>
      <DiscoveryListScreen kind="albums" />
    </Guard>
  );
}
