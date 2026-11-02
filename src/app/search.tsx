import { useLocalSearchParams } from "expo-router";
import Guard from "../components/Guard";
import SearchScreen from "../components/SearchScreen";
export default function Route() {
  const { autoFocus } = useLocalSearchParams<{ autoFocus?: string }>();
  return (
    <Guard>
      <SearchScreen autoFocus={autoFocus === "1"} />
    </Guard>
  );
}
