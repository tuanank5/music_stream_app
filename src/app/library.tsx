import React from "react";
import Guard from "../components/Guard";
import { LibraryScreen } from "../components/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <LibraryScreen />
    </Guard>
  );
}
