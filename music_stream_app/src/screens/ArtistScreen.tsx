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

export function ArtistScreen({ go, setSong }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Artist" back onBack={() => go("Home")} right="•••" />
        <View style={s.artistHeader}>
          <Image source={{ uri: artists[2].image }} style={s.artistBig} />
          <Text style={s.artistName}>Ryan Young</Text>
          <Text style={s.muted}>1.2M monthly listeners</Text>
          <Pressable style={s.follow}>
            <Text style={{ color: "#FFF", fontSize: 11, fontWeight: "700" }}>
              Follow
            </Text>
          </Pressable>
        </View>
        <SectionTitle title="Popular" action="See all" />
        {sampleSongs.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            onPress={() => {
              setSong(song);
              go("Player");
            }}
          />
        ))}
        <SectionTitle title="Albums" action="See all" />
        <ScrollView horizontal>
          {sampleSongs.slice(0, 3).map((song, i) => (
            <View key={song.id} style={{ marginRight: 12 }}>
              <Artwork uri={covers[i]} size={104} radius={5} />
              <Text style={s.cardTitle}>{song.album}</Text>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </View>
  );
}
