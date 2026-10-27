import React from "react";
import { ScrollView, Text, View } from "react-native";
import { colors } from "../colors";
import { Header } from "../components/ScreenPrimitives";
import { Props, base, content } from "./shared";

// TODO (phối hợp auth + UI): lấy profile từ Firebase Auth/Firestore, không hard-code người dùng.
export default function ProfileScreen({ go }: Props) {
  return (
    <View style={base}>
      <ScrollView contentContainerStyle={content}>
        <Header title="Profile" back onBack={() => go("Home")} />
        <Text style={{ color: colors.text, marginTop: 20 }}>
          Profile setup is pending.
        </Text>
      </ScrollView>
    </View>
  );
}
