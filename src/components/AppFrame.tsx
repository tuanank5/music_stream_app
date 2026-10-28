import React from "react";
import { Pressable, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { usePlayer } from "../contexts/PlayerContext";
import { ErrorText, ui } from "./UI";
export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { user } = useAuth(),
    data = useData(),
    player = usePlayer();
  const isPublic = ["/", "/login", "/register"].includes(path);
  const show = !!user && !isPublic;
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "white" }}
      edges={["top", "left", "right", "bottom"]}
    >
      <View style={{ flex: 1 }}>{children}</View>
      {show && data.errors.length > 0 && (
        <ErrorText message={data.errors.join("\n")} />
      )}
      {show && player.current && path !== "/player" && (
        <View
          style={{
            backgroundColor: "#e6f6f3",
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => router.push("/player")}>
            <Text style={{ fontWeight: "700" }} numberOfLines={1}>
              ♫ {player.current.title}
            </Text>
            <Text style={ui.small}>{player.current.artist}</Text>
          </Pressable>
          <Pressable
            onPress={player.toggle}
            accessibilityLabel={player.playing ? "Tạm dừng" : "Phát"}
          >
            <Text style={{ fontSize: 23, padding: 8 }}>
              {player.playing ? "Ⅱ" : "▶"}
            </Text>
          </Pressable>
        </View>
      )}
      {show && path !== "/player" && (
        <View
          style={{
            flexDirection: "row",
            borderTopWidth: 1,
            borderColor: "#e4e8ec",
            paddingVertical: 10,
          }}
        >
          {(
            [
              ["/home", "⌂", "Home"],
              ["/search", "⌕", "Search"],
              ["/feed", "▣", "Feed"],
              ["/library", "▤", "Library"],
            ] as const
          ).map(([href, icon, label]) => (
            <Pressable
              key={href}
              onPress={() => router.replace(href)}
              style={{ flex: 1, alignItems: "center" }}
            >
              <Text
                style={{
                  fontSize: 23,
                  color: path === href ? "#087e78" : "#777",
                }}
              >
                {icon}
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  color: path === href ? "#087e78" : "#777",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
