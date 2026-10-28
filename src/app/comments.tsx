import React from "react";
import Guard from "../components/Guard";
import { CommentsScreen } from "../screens/FeedScreens";
export default function Route() {
  return (
    <Guard>
      <CommentsScreen />
    </Guard>
  );
}
