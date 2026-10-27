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

export function RegisterScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Create account" back onBack={() => go("Welcome")} />
        <Text style={s.formTitle}>Create an account</Text>
        <Text style={s.muted}>Join and discover your music</Text>
        {["Name", "Email address", "Password", "Confirm password"].map(
          (x, i) => (
            <TextInput
              key={x}
              placeholder={x}
              secureTextEntry={i > 1}
              style={s.formInput}
            />
          ),
        )}
        <Pressable
          style={s.formButton}
          onPress={() =>
            Alert.alert(
              "Demo only",
              "Firebase Authentication chưa được kết nối.",
            )
          }
        >
          <Text style={s.darkButtonText}>Create an account</Text>
        </Pressable>
        <Text style={s.formFoot} onPress={() => go("Login")}>
          I already have an account
        </Text>
      </ScrollView>
    </View>
  );
}
