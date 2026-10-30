import React from "react";
import { Text } from "react-native";

import Guard from "../components/Guard";
import { Page, ui } from "../components/UI";
import SongRow from "../components/SongRow";

import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";

export default function Route() {
  const { user } = useAuth();
  const data = useData();

  const songs = data.songs.filter(
    song =>
      song.artistId === user?.uid &&
      song.active,
  );

  return (
    <Guard>
      <Page title="Bài hát tôi đã đăng">
        {songs.map(song => (
          <React.Fragment key={song.id}>
            <Text style={ui.small}>
              {song.visibility}
            </Text>

            <SongRow
              song={song}
              queue={songs}
            />
          </React.Fragment>
        ))}

        {!songs.length ? (
          <Text style={ui.muted}>
            Bạn chưa đăng bài hát.
          </Text>
        ) : null}
      </Page>
    </Guard>
  );
}