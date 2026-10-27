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

export function SearchResultsScreen({
  go,
  setSong,
  searchText,
  setSearchText,
}: Props) {
  const [tab, setTab] = useState("All");
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Search" right="⌕" />
        <SearchBox value={searchText || ""} onChange={setSearchText} />
        <View style={s.pills}>
          {["All", "Tracks", "Albums", "Artists"].map((x) => (
            <Pill
              key={x}
              label={x}
              active={tab === x}
              onPress={() => setTab(x)}
            />
          ))}
        </View>
        {tab === "Artists"
          ? artists.map((a) => (
              <View key={a.name} style={s.artistResult}>
                <Image source={{ uri: a.image }} style={s.smallCircle} />
                <View style={{ flex: 1 }}>
                  <Text style={s.rowTitle}>{a.name}</Text>
                  <Text style={s.muted}>{a.followers}</Text>
                </View>
                <Text style={s.followText}>Follow</Text>
              </View>
            ))
          : sampleSongs.map((song) => (
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
