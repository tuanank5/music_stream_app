import RequireAuth from "../components/RequireAuth";
import MyUploadsScreen from "../screens/MyUploadsScreen";

export default function Route() {
  return (
    <RequireAuth>
      <MyUploadsScreen />
    </RequireAuth>
  );
}
