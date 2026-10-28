import React from "react";
import Guard from "../components/Guard";
import { PlaylistDetailScreen } from "../screens/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <PlaylistDetailScreen />
    </Guard>
  );
}
