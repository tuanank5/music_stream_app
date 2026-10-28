import React from "react";
import Guard from "../components/Guard";
import { PremiumScreen } from "../screens/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <PremiumScreen />
    </Guard>
  );
}
