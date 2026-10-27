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

export function HomeScreen({ go, setSong }: Props) {
  return (
    <ScrollView
      style={base}
      contentContainerStyle={content}
      showsVerticalScrollIndicator={false}
    >
      <View style={s.homeTop}>
        <View>
          <Text style={s.greeting}>Good morning</Text>
          <Text style={s.homeTitle}>Ashley Scott</Text>
        </View>
        <Image source={{ uri: artists[0].image }} style={s.avatar} />
      </View>
      <SearchBox
        value=""
        onChange={(v) => go("Search")}
        placeholder="Search songs, artists, albums"
      />
      <SectionTitle title="Suggestions for you" action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ paddingHorizontal: 18 }}
      >
        {sampleSongs.slice(0, 4).map((song, i) => (
          <Pressable
            key={song.id}
            onPress={() => {
              setSong(song);
              go("Player");
            }}
            style={{ width: 112, marginRight: 10 }}
          >
            <Artwork uri={covers[i % 3]} size={112} radius={5} />
            <Text numberOfLines={1} style={s.cardTitle}>
              {i === 0 ? "Jessica Gonzalez" : song.artist}
            </Text>
            <Text style={s.smallText}>New release</Text>
          </Pressable>
        ))}
      </ScrollView>
      <SectionTitle title="Charts" action="View all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ paddingHorizontal: 18 }}
      >
        {["Top 50\nCanada", "Top 50\nGlobal", "Daily Top\nSongs"].map(
          (x, i) => (
            <Pressable
              key={x}
              onPress={() => go("Charts")}
              style={[
                s.chartCard,
                { backgroundColor: ["#6D48D8", "#5A9BD6", "#EF8A9C"][i] },
              ]}
            >
              <Text style={s.chartTiny}>MUSIC STREAM</Text>
              <Text style={s.chartTitle}>{x}</Text>
              <Text style={s.chartTiny}>Daily charts · updated today</Text>
            </Pressable>
          ),
        )}
      </ScrollView>
      <SectionTitle title="Trending albums" action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ paddingHorizontal: 18 }}
      >
        {sampleSongs.slice(0, 4).map((song, i) => (
          <Pressable
            key={song.id}
            onPress={() => {
              setSong(song);
              go("Player");
            }}
            style={{ width: 98, marginRight: 10 }}
          >
            <Artwork uri={covers[(i + 1) % 3]} size={98} radius={5} />
            <Text style={s.cardTitle} numberOfLines={1}>
              {song.album}
            </Text>
            <Text style={s.smallText} numberOfLines={1}>
              {song.artist}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <SectionTitle title="Popular artist" action="See all" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -18 }}
        contentContainerStyle={{ paddingHorizontal: 18 }}
      >
        {artists.map((a) => (
          <Pressable
            key={a.name}
            onPress={() => go("Artist")}
            style={{ width: 85, alignItems: "center", marginRight: 12 }}
          >
            <Image source={{ uri: a.image }} style={s.artistCircle} />
            <Text style={s.cardTitle} numberOfLines={1}>
              {a.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </ScrollView>
  );
}
