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

export function PlaylistsScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Playlists" back onBack={() => go("Library")} right="⌕" />
        <Text style={s.playlistHeading}>Your playlists</Text>
        {[
          ["ipsum sit nulla", "Ashley Scott", "12 songs"],
          ["Occaecat aliquip", "Jessica Gonzalez", "4 songs"],
        ].map((x, i) => (
          <Pressable
            key={x[0]}
            style={s.playlistLine}
            onPress={() => Alert.alert(x[0], "Playlist preview")}
          >
            <Artwork uri={covers[i]} size={46} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{x[0]}</Text>
              <Text style={s.muted}>
                {x[1]} · {x[2]}
              </Text>
            </View>
            <Text style={{ fontSize: 20, color: colors.textSecondary }}>›</Text>
          </Pressable>
        ))}
        <Pressable
          style={s.fab}
          onPress={() =>
            Alert.alert(
              "New playlist",
              "Playlist creation can be connected to Firestore next.",
            )
          }
        >
          <Text style={{ color: "#FFF", fontSize: 26 }}>＋</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
