import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../colors";

const items = [
  { key: "Home", icon: "⌂" },
  { key: "Search", icon: "⌕" },
  { key: "Feed", icon: "▣" },
  { key: "Library", icon: "▤" },
];
export default function BottomNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <View style={styles.bar}>
      {items.map((item) => (
        <Pressable
          key={item.key}
          style={styles.item}
          onPress={() => onChange(item.key)}
          accessibilityRole="button"
          accessibilityLabel={item.key}
        >
          <Text style={[styles.icon, active === item.key && styles.selected]}>
            {item.icon}
          </Text>
          <Text style={[styles.label, active === item.key && styles.selected]}>
            {item.key}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F0F1F3",
    paddingTop: 8,
    paddingBottom: 7,
  },
  item: { flex: 1, alignItems: "center", gap: 2 },
  icon: { fontSize: 22, color: "#969AA3" },
  label: { fontSize: 10, color: "#969AA3" },
  selected: { color: colors.primaryDark },
});
