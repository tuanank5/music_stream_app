import React from "react";
import Guard from "../components/Guard";
import { FavoritesScreen } from "../components/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <FavoritesScreen />
    </Guard>
  );
}
