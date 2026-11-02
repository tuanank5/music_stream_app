import Guard from "../components/Guard";
import ProfileScreen from "../components/ProfileScreen";
export default function Route() {
  return (
    <Guard>
      <ProfileScreen />
    </Guard>
  );
}
