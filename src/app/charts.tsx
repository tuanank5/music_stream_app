import React from "react";
import Guard from "../components/Guard";
import { ChartsScreen } from "../screens/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <ChartsScreen />
    </Guard>
  );
}
