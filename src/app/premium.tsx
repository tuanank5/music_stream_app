import React from "react";
import Guard from "../components/Guard";
import { PremiumScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <PremiumScreen />
    </Guard>
  );
}
