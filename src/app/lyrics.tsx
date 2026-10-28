import React from "react";
import Guard from "../components/Guard";
import { LyricsScreen } from "../screens/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <LyricsScreen />
    </Guard>
  );
}
