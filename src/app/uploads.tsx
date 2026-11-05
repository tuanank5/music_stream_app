import Guard from "../components/Guard";
import MyUploadsScreen from "../components/MyUploadsScreen";

export default function Route() {
  return (
    <Guard>
      <MyUploadsScreen />
    </Guard>
  );
}
