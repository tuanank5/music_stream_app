import Guard from "../components/Guard";
import AccountScreen from "../components/AccountScreen";
export default function Route() {
  return (
    <Guard>
      <AccountScreen />
    </Guard>
  );
}
