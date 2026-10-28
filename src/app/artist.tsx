import React from "react";
import Guard from "../components/Guard";
import { ArtistScreen } from "../screens/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <ArtistScreen />
    </Guard>
  );
}
