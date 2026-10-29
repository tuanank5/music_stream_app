import React from "react";
import Guard from "../components/Guard";
import { ArtistScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <ArtistScreen />
    </Guard>
  );
}
