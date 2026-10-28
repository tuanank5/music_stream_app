import React from "react";
import Guard from "../components/Guard";
import Screen from "../screens/HomeScreen";
export default function Route() {
  return (
    <Guard>
      <Screen />
    </Guard>
  );
}
