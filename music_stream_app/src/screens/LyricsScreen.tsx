import React from "react";
import { ScrollView, Text, View } from "react-native";
import { colors } from "../colors";
import { Header } from "../components/ScreenPrimitives";
import { Props, base, content } from "./shared";

// TODO (phối hợp songService + UI): chỉ hiển thị lời bài hát khi nguồn dữ liệu có lyrics.
export default function LyricsScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Lyrics" back onBack={() => go("Player")} />
        <Text style={{ color: colors.text, marginTop: 20 }}>
          Lyrics are not available for this demo song.
        </Text>
      </ScrollView>
    </View>
  );
}
