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

export function PremiumPlansScreen({ go }: Props) {
  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1000",
      }}
      style={s.premiumBg}
      resizeMode="cover"
    >
      <View
        style={[s.premiumTint, { backgroundColor: "rgba(100,15,180,.65)" }]}
      />
      <View style={s.planContent}>
        <Text style={s.planTitle}>Unlimited{"\n"}music selections</Text>
        <View style={s.planCard}>
          <Text style={s.planName}>Premium</Text>
          <Text style={s.muted}>First 1 month free</Text>
          <Text style={s.price}>
            $12.90
            <Text style={{ fontSize: 11, fontWeight: "400" }}>/month</Text>
          </Text>
          {[
            "Ad-free listening",
            "Download to listen offline",
            "Access full catalog Premium",
            "High sound quality",
            "Cancel anytime",
          ].map((x) => (
            <Text key={x} style={s.perk}>
              ✓ {x}
            </Text>
          ))}
          <Pressable
            style={s.subscribe}
            onPress={() =>
              Alert.alert("Premium demo", "Thanh toán thật chưa được tích hợp.")
            }
          >
            <Text style={{ color: "#FFF", fontWeight: "700", fontSize: 12 }}>
              Subscribe now
            </Text>
          </Pressable>
        </View>
        <Text style={s.backHome} onPress={() => go("Home")}>
          Back home
        </Text>
      </View>
    </ImageBackground>
  );
}
