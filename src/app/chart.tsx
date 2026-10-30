import React from "react";
import Guard from "../components/Guard";
import { ChartDetailScreen } from "../components/ChartScreens";

export default function Route() {
  return (
    <Guard>
      <ChartDetailScreen />
    </Guard>
  );
}