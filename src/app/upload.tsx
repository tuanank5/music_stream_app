import React from "react";
import Guard from "../components/Guard";
import UploadSongScreen from "../components/UploadSongScreen";

export default function Route() {
  return (
    <Guard>
      <UploadSongScreen />
    </Guard>
  );
}