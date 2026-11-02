import Guard from "../components/Guard";
import PlayerScreen from "../components/PlayerScreen";

export default function Route() {
  return (
    <Guard>
      <PlayerScreen />
    </Guard>
  );
}
