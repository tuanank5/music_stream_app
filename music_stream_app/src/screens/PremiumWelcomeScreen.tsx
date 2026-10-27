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

export function PremiumWelcomeScreen({ go }: Props) {
  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1000",
      }}
      style={s.premiumBg}
      resizeMode="cover"
    >
      <View style={s.premiumTint} />
      <View style={s.premiumInner}>
        <Text style={{ fontSize: 42, color: "#FFF" }}>〽</Text>
        <Text style={s.premiumTitle}>Welcome to{"\n"}Premium</Text>
        <Text style={s.whiteSmall}>• • •</Text>
        <Pressable style={s.darkButton} onPress={() => go("PremiumPlans")}>
          <Text style={s.darkButtonText}>Start listening</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}
