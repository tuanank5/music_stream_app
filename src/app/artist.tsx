import React from "react";
import Guard from "../components/Guard";
import ArtistProfileScreen from "../components/ArtistProfileScreen";
export default function Route() {
  return (
    <Guard>
      <ArtistProfileScreen />
    </Guard>
  );
}
