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

export function WelcomeScreen({ go }: Props) {
  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=1000",
      }}
      resizeMode="cover"
      style={s.welcome}
    >
      <View style={s.welcomeTint} />
      <View style={s.logoMark}>
        <Text style={{ fontSize: 42, color: "#FFF" }}>〽</Text>
      </View>
      <View style={s.welcomeBottom}>
        <Text style={s.welcomeTitle}>Your music{"\n"}Your artists</Text>
        <Pressable style={s.darkButton} onPress={() => go("Register")}>
          <Text style={s.darkButtonText}>Create an account</Text>
        </Pressable>
        <Pressable style={s.lightButton} onPress={() => go("Login")}>
          <Text style={s.lightButtonText}>I already have an account</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
