import Guard from "../components/Guard";
import HistoryScreen from "../components/HistoryScreen";

export default function Route() {
  return (
    <Guard>
      <HistoryScreen />
    </Guard>
  );
}
