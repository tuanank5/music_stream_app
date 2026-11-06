import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import PublicProfileScreen from "../screens/PublicProfileScreen";
export default function Route() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RequireAuth>
      <PublicProfileScreen id={id || ""} />
    </RequireAuth>
  );
}
