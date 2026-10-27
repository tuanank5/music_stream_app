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

export function FeedScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Feed" right="＋" />
        {[
          {
            name: "Jessica Gonzalez",
            caption: "Posted a new single",
            cover:
              "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900",
            title: "FLOWER",
          },
          {
            name: "William King",
            caption: "is listening now",
            cover:
              "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=900",
            title: "Me",
          },
        ].map((p, i) => (
          <View key={p.name} style={s.post}>
            <View style={s.postHeader}>
              <Image source={{ uri: artists[i].image }} style={s.smallCircle} />
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{p.name}</Text>
                <Text style={s.muted}>{p.caption}</Text>
              </View>
              <Text style={s.muted}>•••</Text>
            </View>
            <Image source={{ uri: p.cover }} style={s.postImage} />
            <Text style={s.rowTitle}>{p.title}</Text>
            <Text style={s.muted}>♡ 128 likes ◯ 3 comments</Text>
            <View style={s.postActions}>
              <Text style={s.muted}>♡ Like</Text>
              <Pressable onPress={() => go("Comments")}>
                <Text style={s.muted}>◯ Comment</Text>
              </Pressable>
              <Text style={s.muted}>↗ Share</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
