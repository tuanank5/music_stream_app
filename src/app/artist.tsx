import React from "react";
import Guard from "../components/Guard";
import ArtistProfileScreen from "../components/ArtistProfileScreen";
// import { ArtistScreen } from "../components/DetailScreens";
export default function Route() {
  return (
    <Guard>
      <ArtistProfileScreen />
    </Guard>
  );
}
