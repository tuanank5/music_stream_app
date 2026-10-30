import React from "react";
import Guard from "../components/Guard";
import { ChartsListScreen } from "../components/ChartScreens";
// import { ChartsScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <ChartsListScreen />
    </Guard>
  );
}
