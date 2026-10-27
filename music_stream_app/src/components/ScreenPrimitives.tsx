import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../colors";
export function Header({
  title,
  back,
  onBack,
  right,
}: {
  title: string;
  back?: boolean;
  onBack?: () => void;
  right?: string;
}) {
  return (
    <View style={styles.header}>
      {back ? (
        <Pressable onPress={onBack} hitSlop={10}>
          <Text style={styles.back}>‹</Text>
        </Pressable>
      ) : (
        <View style={{ width: 20 }} />
      )}
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.right}>{right || ""}</Text>
    </View>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.search}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#A2A5AD"
        style={styles.input}
      />
      {!!value && (
        <Pressable onPress={() => onChange("")}>
          <Text style={styles.clear}>×</Text>
        </Pressable>
      )}
    </View>
  );
}
export function Pill({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
export function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.action}>{action}</Text> : null}
    </View>
  );
}
const styles = StyleSheet.create({
  header: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  back: { fontSize: 30, color: colors.text, width: 24 },
  heading: {
    fontSize: 17,
    color: colors.text,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  right: { width: 24, textAlign: "right", color: colors.text, fontSize: 18 },
  search: {
    height: 39,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: { fontSize: 21, color: colors.textSecondary, marginRight: 7 },
  input: { flex: 1, fontSize: 12, color: colors.text, paddingVertical: 0 },
  clear: { color: colors.text, fontSize: 18, paddingLeft: 8 },
  pill: {
    paddingHorizontal: 15,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#FFF",
  },
  pillActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  pillText: { color: colors.textSecondary, fontSize: 11 },
  pillTextActive: { color: colors.primaryDark, fontWeight: "700" },
  section: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  action: { color: colors.primaryDark, fontSize: 10 },
});
