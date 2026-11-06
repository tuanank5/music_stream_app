import RequireAuth from "../components/RequireAuth";
import { PremiumScreen } from "../screens/PremiumScreen";
export default function Route() {
  return (
    <RequireAuth>
      <PremiumScreen />
    </RequireAuth>
  );
}
