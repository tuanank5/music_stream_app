import React from "react";
import { Image, StyleSheet, View } from "react-native";

export default function Artwork({
  uri,
  size = 54,
  radius = 10,
}: {
  uri: string;
  size?: number;
  radius?: number;
}) {
  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: radius },
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        resizeMode="cover"
      />
    </View>
  );
}
const styles = StyleSheet.create({
  frame: { overflow: "hidden", backgroundColor: "#E9E9EF" },
});
