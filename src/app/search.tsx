import { useLocalSearchParams } from "expo-router";
import RequireAuth from "../components/RequireAuth";
import SearchScreen from "../screens/SearchScreen";
export default function Route() {
  const { autoFocus } = useLocalSearchParams<{ autoFocus?: string }>();
  return (
    <RequireAuth>
      <SearchScreen autoFocus={autoFocus === "1"} />
    </RequireAuth>
  );
}
