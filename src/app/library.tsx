import RequireAuth from "../components/RequireAuth";
import { LibraryScreen } from "../screens/LibraryScreen";
export default function Route() {
  return (
    <RequireAuth>
      <LibraryScreen />
    </RequireAuth>
  );
}
