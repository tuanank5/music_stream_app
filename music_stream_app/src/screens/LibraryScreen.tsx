import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../colors";
import { sampleSongs } from "../hooks/useSongs";
import { Song } from "../types/Song";
import Artwork from "../components/Artwork";
import SongRow from "../components/SongRow";
import {
  Header,
  Pill,
  SearchBox,
  SectionTitle,
} from "../components/ScreenPrimitives";
import { Props, artists, covers, base, content, s } from "./shared";

export function LibraryScreen({ go, setSong }: Props) {
  const [tab, setTab] = useState("Songs");
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Your Library" right="⌕" />
        <View style={s.pills}>
          {["Playlists", "New tag", "Songs", "Albums", "Artists"].map((x) => (
            <Pill
              key={x}
              label={x}
              active={tab === x}
              onPress={() => setTab(x)}
            />
          ))}
        </View>
        {tab === "Playlists" ? (
          <Pressable onPress={() => go("Playlists")} style={s.playlistLine}>
            <Artwork uri={covers[0]} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>Your playlists</Text>
              <Text style={s.muted}>2 playlists</Text>
            </View>
            <Text>›</Text>
          </Pressable>
        ) : (
          sampleSongs.map((song, i) => (
            <SongRow
              key={song.id}
              song={song}
              trailing={i % 2 === 0 ? "♥" : "›"}
              onPress={() => {
                setSong(song);
                go("Player");
              }}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
