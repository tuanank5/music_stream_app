import RequireAuth from "../components/RequireAuth";
import AccountScreen from "../screens/AccountScreen";
export default function Route() {
  return (
    <RequireAuth>
      <AccountScreen />
    </RequireAuth>
  );
}
