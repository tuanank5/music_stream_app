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

export function PlayerScreen({ go, setSong }: Props) {
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const song = sampleSongs[0];
  return (
    <ImageBackground
      source={{
        uri: "https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1000",
      }}
      style={s.playerBg}
      resizeMode="cover"
    >
      <View style={s.playerShade} />
      <View style={s.playerContent}>
        <Header title="Playing" back onBack={() => go("Home")} right="⌄" />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Artwork uri={song.cover} size={180} radius={3} />
          <Text style={s.playerSong}>FLOWER</Text>
          <Text style={s.playerArtist}>Jessica Gonzalez</Text>
          <View style={s.wave}>
            <Text style={{ color: "#FFF", letterSpacing: 2, fontSize: 16 }}>
              ▂▅▃▇▅▂▆▃▇▅▂▃▆▇▂▅▃▆▂▇▅▃
            </Text>
          </View>
          <View style={s.progress}>
            <View style={s.progressFill} />
          </View>
          <View style={s.timeRow}>
            <Text style={s.whiteSmall}>0:06</Text>
            <Text style={s.whiteSmall}>3:08</Text>
          </View>
          <View style={s.controls}>
            <Text style={s.whiteControl}>⤨</Text>
            <Text style={s.whiteControl}>|◀</Text>
            <Pressable style={s.bigPlay} onPress={() => setPlaying(!playing)}>
              <Text style={{ fontSize: 28, color: "#111" }}>
                {playing ? "Ⅱ" : "▶"}
              </Text>
            </Pressable>
            <Text style={s.whiteControl}>▶|</Text>
            <Text style={s.whiteControl}>↻</Text>
          </View>
          <View style={s.playerFooter}>
            <Pressable onPress={() => setLiked(!liked)}>
              <Text style={s.whiteSmall}>{liked ? "♥" : "♡"} 492</Text>
            </Pressable>
            <Text style={s.whiteSmall}>☷ Lyrics</Text>
            <Text style={s.whiteSmall}>⤴</Text>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}
