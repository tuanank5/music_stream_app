import RequireAuth from "../components/RequireAuth";
import ArtistProfileScreen from "../screens/ArtistProfileScreen";
export default function Route() {
  return (
    <RequireAuth>
      <ArtistProfileScreen />
    </RequireAuth>
  );
}
