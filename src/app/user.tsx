import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import PublicProfileScreen from "../components/PublicProfileScreen";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Guard>
      <PublicProfileScreen id={id || ""} />
    </Guard>
  );
}
