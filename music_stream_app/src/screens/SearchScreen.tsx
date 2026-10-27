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

export function SearchScreen({
  go,
  setSong,
  searchText,
  setSearchText,
}: Props) {
  const [tab, setTab] = useState("All");
  const filtered = useMemo(
    () =>
      sampleSongs.filter((x) =>
        (x.title + " " + x.artist)
          .toLowerCase()
          .includes(searchText.toLowerCase()),
      ),
    [searchText],
  );
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Search" right="⌕" />
        <SearchBox
          value={searchText}
          onChange={setSearchText}
          placeholder="Search"
        />
        {searchText ? (
          <>
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
            {filtered.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                onPress={() => {
                  setSong(song);
                  go("Player");
                }}
              />
            ))}
            {filtered.length === 0 && (
              <Text style={s.muted}>No results found</Text>
            )}
          </>
        ) : (
          <>
            <Text style={s.muted}>Recent searches</Text>
            {[
              "me",
              "me ilum id aliquip",
              "me lorem",
              "Me Gonzalez",
              "Me iure esse",
              "Me Exercitation",
              "Me Sint aliquid",
            ].map((x) => (
              <Pressable
                key={x}
                onPress={() => setSearchText(x)}
                style={s.recent}
              >
                <Text style={s.recentText}>{x}</Text>
                <Text style={s.muted}>↗</Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}
