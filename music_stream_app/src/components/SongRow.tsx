import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../colors";
import { Song } from "../types/Song";
import Artwork from "./Artwork";
export default function SongRow({
  song,
  onPress,
  trailing = "•••",
}: {
  song: Song;
  onPress?: () => void;
  trailing?: string;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Artwork uri={song.cover} size={43} radius={7} />
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {song.title}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {song.artist} · {song.duration}
        </Text>
      </View>
      <Text style={styles.trailing}>{trailing}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    gap: 10,
  },
  details: { flex: 1 },
  title: { color: colors.text, fontWeight: "600", fontSize: 12 },
  artist: { color: colors.textSecondary, fontSize: 10, marginTop: 4 },
  trailing: { color: "#7C8089", paddingHorizontal: 6, fontSize: 16 },
});
