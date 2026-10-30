import React from "react";
import { Text } from "react-native";
import { useLocalSearchParams } from "expo-router";

import Guard from "../components/Guard";
import { Page, ui } from "../components/UI";
import SongRow from "../components/SongRow";
import { useData } from "../contexts/DataContext";

export default function Route() {
  const { id } =
    useLocalSearchParams<{ id: string }>();

  const data = useData();

  const album =
    data.albums.find(value => value.id === id);

  const songs = data.songs
    .filter(
      song =>
        song.albumId === id &&
        song.active &&
        song.isPublished &&
        song.visibility === "public",
    )
    .sort(
      (a, b) =>
        b.playCount - a.playCount ||
        a.id.localeCompare(b.id),
    );

  return (
    <Guard>
      <Page title={album?.title || "Album"}>
        <Text style={ui.muted}>
          {songs.reduce(
            (total, song) => total + song.playCount,
            0,
          )} lượt nghe
        </Text>

        {songs.map(song => (
          <SongRow
            key={song.id}
            song={song}
            queue={songs}
          />
        ))}
      </Page>
    </Guard>
  );
}