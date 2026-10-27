import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../colors";
import { Song } from "../types/Song";
import Artwork from "./Artwork";

export default function MiniPlayer({
  song,
  playing,
  onToggle,
  onOpen,
}: {
  song: Song;
  playing: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <Pressable onPress={onOpen} style={styles.wrap}>
      <Artwork uri={song.cover} size={39} radius={6} />
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      <Pressable
        onPress={onToggle}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={playing ? "Pause" : "Play"}
      >
        <Text style={styles.play}>{playing ? "Ⅱ" : "▶"}</Text>
      </Pressable>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: "#E9EAED",
    backgroundColor: "#FFF",
    gap: 10,
  },
  info: { flex: 1 },
  title: { color: colors.text, fontWeight: "700", fontSize: 12 },
  artist: { color: colors.textSecondary, fontSize: 10, marginTop: 3 },
  play: { color: colors.text, fontSize: 20, paddingHorizontal: 8 },
});
