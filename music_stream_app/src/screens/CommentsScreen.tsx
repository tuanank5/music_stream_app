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

export function CommentsScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="3 comments" back onBack={() => go("Feed")} />
        {[
          ["Sally Rooney", "Nice song!"],
          ["Jason Moore", "I love this vibe"],
          ["Michael Kay", "Jessica Gonzalez 🔥"],
        ].map(([name, msg]) => (
          <View key={name} style={s.comment}>
            <View style={s.smallCircle} />
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{name}</Text>
              <Text style={s.commentText}>{msg}</Text>
              <Text style={s.muted}>Reply · 2h</Text>
            </View>
            <Text style={s.muted}>♡</Text>
          </View>
        ))}
      </ScrollView>
      <View style={s.commentInput}>
        <Text style={s.aIcon}>A</Text>
        <TextInput
          placeholder="Write a comment..."
          style={{ flex: 1, fontSize: 12 }}
        />
        <Text style={{ color: colors.primaryDark }}>➤</Text>
      </View>
    </View>
  );
}
