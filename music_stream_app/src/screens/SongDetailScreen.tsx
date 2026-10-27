import React from "react";
import { ScrollView, Text, View } from "react-native";
import { colors } from "../colors";
import { Header } from "../components/ScreenPrimitives";
import { Props, base, content } from "./shared";

// TODO (phối hợp UI + data): nối màn hình này với dữ liệu bài hát thật trong songService.
export default function SongDetailScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Song details" back onBack={() => go("Home")} />
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "700",
            marginTop: 20,
          }}
        >
          Song detail
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
          Màn hình khung — cần truyền bài hát đang chọn.
        </Text>
      </ScrollView>
    </View>
  );
}
