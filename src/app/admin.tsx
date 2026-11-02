import Guard from "../components/Guard";
import AdminScreen from "../components/AdminScreen";
export default function Route() {
  return (
    <Guard admin>
      <AdminScreen />
    </Guard>
  );
}
