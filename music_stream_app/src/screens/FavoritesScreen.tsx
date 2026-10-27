import React from "react";
import { ScrollView, Text, View } from "react-native";
import { colors } from "../colors";
import { Header } from "../components/ScreenPrimitives";
import { Props, base, content } from "./shared";

// TODO (phối hợp UI + hooks): hiển thị danh sách từ useFavorites, thêm trạng thái rỗng/loading/error.
export default function FavoritesScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Favorites" back onBack={() => go("Library")} />
        <Text style={{ color: colors.text, marginTop: 20 }}>
          Your favorite songs will appear here.
        </Text>
      </ScrollView>
    </View>
  );
}
