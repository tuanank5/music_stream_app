import RequireAuth from "../components/RequireAuth";
import UploadSongScreen from "../screens/UploadSongScreen";

export default function Route() {
  return (
    <RequireAuth>
      <UploadSongScreen />
    </RequireAuth>
  );
}
