import React from "react";
import Guard from "../components/Guard";
import { LyricsScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <LyricsScreen />
    </Guard>
  );
}
