import React from "react";
import Guard from "../components/Guard";
import { ChartsListScreen } from "../components/ChartScreens";
export default function Route() {
  return (
    <Guard>
      <ChartsListScreen />
    </Guard>
  );
}
