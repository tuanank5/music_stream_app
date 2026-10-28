import React from "react";
import Guard from "../components/Guard";
import { SongDetailScreen } from "../screens/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <SongDetailScreen />
    </Guard>
  );
}
