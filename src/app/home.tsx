import Guard from "../components/Guard";
import HomeScreen from "../components/HomeScreen";

export default function Route() {
  return (
    <Guard>
      <HomeScreen />
    </Guard>
  );
}
