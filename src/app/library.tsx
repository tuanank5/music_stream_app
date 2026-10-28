import React from "react";
import Guard from "../components/Guard";
import { LibraryScreen } from "../screens/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <LibraryScreen />
    </Guard>
  );
}
