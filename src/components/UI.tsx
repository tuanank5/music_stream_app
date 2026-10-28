import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors } from "../colors";
export const ui = StyleSheet.create({
  page: { padding: 20, paddingBottom: 30 },
  title: {
    fontSize: 27,
    fontWeight: "800",
    color: colors.text,
    marginVertical: 12,
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    marginVertical: 14,
  },
  muted: { fontSize: 14, color: "#676c76", lineHeight: 21 },
  error: {
    color: "#a32836",
    backgroundColor: "#fff0f2",
    padding: 12,
    borderRadius: 10,
    marginVertical: 8,
  },
  card: {
    backgroundColor: "#f3f7f8",
    padding: 16,
    borderRadius: 14,
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  link: { color: "#087e78", fontWeight: "600", paddingVertical: 9 },
  input: {
    borderWidth: 1,
    borderColor: "#ced3da",
    borderRadius: 12,
    padding: 13,
    color: "#22242a",
    backgroundColor: "#fff",
    fontSize: 15,
    marginBottom: 12,
  },
  small: { fontSize: 12, color: "#767b85" },
  danger: { color: "#a32836", padding: 10 },
});
export function Page({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.page}
    >
      {title ? <Text style={ui.title}>{title}</Text> : null}
      {children}
    </ScrollView>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: secondary ? "#eff4f5" : "#087e78",
        padding: 14,
        borderRadius: 24,
        alignItems: "center",
        marginVertical: 6,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        style={{ color: secondary ? "#1b3434" : "white", fontWeight: "700" }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  secure = false,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={{ color: "#4c535d", marginBottom: 6 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        style={[
          ui.input,
          multiline && { minHeight: 90, textAlignVertical: "top" },
        ]}
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize="none"
        placeholderTextColor="#969ba4"
      />
    </View>
  );
}
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <Text selectable style={ui.error}>
      {message}
    </Text>
  ) : null;
}
export function Loading() {
  return (
    <View style={{ padding: 35 }}>
      <ActivityIndicator color="#087e78" />
      <Text style={[ui.muted, { textAlign: "center", marginTop: 10 }]}>
        Đang tải...
      </Text>
    </View>
  );
}
