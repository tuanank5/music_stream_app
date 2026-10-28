import React from "react";
import Guard from "../components/Guard";
import { FavoritesScreen } from "../screens/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <FavoritesScreen />
    </Guard>
  );
}
