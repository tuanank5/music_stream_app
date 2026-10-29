import React from "react";
import Guard from "../components/Guard";
import { PlaylistsScreen } from "../components/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <PlaylistsScreen />
    </Guard>
  );
}
