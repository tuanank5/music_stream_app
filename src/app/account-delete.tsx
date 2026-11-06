import RequireAuth from "../components/RequireAuth";
import AccountDeleteScreen from "../screens/AccountDeleteScreen";
export default function Route() {
  return (
    <RequireAuth>
      <AccountDeleteScreen />
    </RequireAuth>
  );
}
