import Guard from "../components/Guard";
import FeedScreen from "../components/FeedScreen";
export default function Route() {
  return (
    <Guard>
      <FeedScreen />
    </Guard>
  );
}
