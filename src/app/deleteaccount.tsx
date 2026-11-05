import Guard from "../components/Guard";
import DeleteAccountScreen from "../components/DeleteAccountScreen";
export default function Route() {
  return (
    <Guard>
      <DeleteAccountScreen />
    </Guard>
  );
}
