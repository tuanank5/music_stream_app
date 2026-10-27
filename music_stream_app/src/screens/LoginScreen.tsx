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

export function LoginScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Log in" back onBack={() => go("Welcome")} />
        <Text style={s.formTitle}>Welcome back</Text>
        <Text style={s.muted}>Log in to continue listening</Text>
        <TextInput placeholder="Email address" style={s.formInput} />
        <TextInput placeholder="Password" secureTextEntry style={s.formInput} />
        <Pressable style={s.formButton} onPress={() => go("Home")}>
          <Text style={s.darkButtonText}>Log in</Text>
        </Pressable>
        <Text style={s.formFoot} onPress={() => go("Register")}>
          Don't have an account? Sign up
        </Text>
      </ScrollView>
    </View>
  );
}
