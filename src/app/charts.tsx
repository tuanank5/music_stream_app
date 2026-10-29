import React from "react";
import Guard from "../components/Guard";
import { ChartsScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <ChartsScreen />
    </Guard>
  );
}
