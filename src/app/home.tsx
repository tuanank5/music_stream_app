import RequireAuth from "../components/RequireAuth";
import HomeScreen from "../screens/HomeScreen";

export default function Route() {
  return (
    <RequireAuth>
      <HomeScreen />
    </RequireAuth>
  );
}
