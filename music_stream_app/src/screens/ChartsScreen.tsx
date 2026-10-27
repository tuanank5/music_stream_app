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

export function ChartsScreen({ go, setSong }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header
          title="Top 50 · Canada"
          back
          onBack={() => go("Home")}
          right="♡"
        />
        <View style={s.chartHero}>
          <View>
            <Text style={s.chartTiny}>MUSIC STREAM CHARTS</Text>
            <Text style={s.heroTitle}>Top 50{"\n"}Canada</Text>
            <Text style={s.chartTiny}>Daily chart · Updated today</Text>
          </View>
          <Text style={{ fontSize: 42 }}>♫</Text>
        </View>
        <View style={s.actionsLine}>
          <Text style={s.muted}>♡ ⤴</Text>
          <Text style={s.muted}>Shuffle</Text>
          <Pressable
            onPress={() => {
              setSong(sampleSongs[0]);
              go("Player");
            }}
            style={s.roundPlay}
          >
            <Text style={{ color: "#FFF" }}>▶</Text>
          </Pressable>
        </View>
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
      </ScrollView>
    </View>
  );
}
