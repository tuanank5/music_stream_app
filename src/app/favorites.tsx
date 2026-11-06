import RequireAuth from "../components/RequireAuth";
import { FavoritesScreen } from "../screens/FavoritesScreen";
export default function Route() {
  return (
    <RequireAuth>
      <FavoritesScreen />
    </RequireAuth>
  );
}
