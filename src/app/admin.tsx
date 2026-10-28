import React from "react";
import Guard from "../components/Guard";
import Screen from "../screens/AdminScreen";
export default function Route() {
  return (
    <Guard admin>
      <Screen />
    </Guard>
  );
}
