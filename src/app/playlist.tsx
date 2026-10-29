import React from "react";
import Guard from "../components/Guard";
import { PlaylistDetailScreen } from "../components/LibraryScreens";
export default function Route() {
  return (
    <Guard>
      <PlaylistDetailScreen />
    </Guard>
  );
}
