import React from "react";
import Guard from "../components/Guard";
import { SongDetailScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <SongDetailScreen />
    </Guard>
  );
}
