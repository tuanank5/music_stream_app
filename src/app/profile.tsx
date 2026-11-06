import RequireAuth from "../components/RequireAuth";
import ProfileScreen from "../screens/ProfileScreen";
export default function Route() {
  return (
    <RequireAuth>
      <ProfileScreen />
    </RequireAuth>
  );
}
