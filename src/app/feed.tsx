import RequireAuth from "../components/RequireAuth";
import FeedScreen from "../screens/FeedScreen";
export default function Route() {
  return (
    <RequireAuth>
      <FeedScreen />
    </RequireAuth>
  );
}
