import React from "react";
import Guard from "../components/Guard";
import { FeedScreen } from "../screens/FeedScreens";
export default function Route() {
  return (
    <Guard>
      <FeedScreen />
    </Guard>
  );
}
