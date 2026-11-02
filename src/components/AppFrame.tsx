import { router, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { XStack, YStack, styled } from "tamagui";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import MiniPlayer from "./MiniPlayer";
import { Action, AppIcon, AppText, ErrorText } from "./UI";
const SafeFrame = styled(SafeAreaView, {
  displayName: "SafeFrame",
  flex: 1,
  backgroundColor: "background",
});
export function AppFrame({ children }: { children: React.ReactNode }) {
  const path = usePathname(),
    { user } = useAuth(),
    data = useData();
  const isPublic = ["/", "/login", "/register"].includes(path);
  const show = !!user && !isPublic;
  const fullScreen = path === "/player" || path === "/comments";
  return (
    <SafeFrame
      edges={
        path === "/" || fullScreen ? [] : ["top", "left", "right", "bottom"]
      }
    >
      <StatusBar
        style={path === "/" || path === "/player" ? "light" : "dark"}
      />
      <YStack
        flex={1}
        minHeight={0}
        overflow="hidden"
        position="relative"
        zIndex={0}
      >
        {children}
      </YStack>
      {show && path !== "/home" && !fullScreen && data.errors.length > 0 && (
        <ErrorText message={data.errors.join("\n")} />
      )}
      {show && !fullScreen && <MiniPlayer />}
      {show && !fullScreen && (
        <XStack
          borderTopWidth={1}
          borderColor="borderColor"
          paddingVertical="1"
          backgroundColor="background"
          flexShrink={0}
        >
          {(
            [
              ["/home", "home", "Home"],
              ["/search", "search", "Search"],
              ["/feed", "feed", "Feed"],
              ["/library", "library", "Library"],
            ] as const
          ).map(([href, icon, label]) => (
            <Action
              key={href}
              onPress={() => {
                if (path === href) return;
                // Reuse Home already in the stack instead of creating a fresh copy.
                if (href === "/home") router.navigate("/home");
                else router.replace(href);
              }}
              flex={1}
              alignItems="center"
              justifyContent="center"
              minHeight={56}
              gap="1"
              aria-label={label}
              aria-current={path === href ? "page" : undefined}
            >
              <AppIcon
                name={icon}
                size={23}
                color={path === href ? "accent" : "textMuted"}
              />
              <AppText
                fontSize={11}
                lineHeight="16px"
                fontWeight={path === href ? "700" : "400"}
                color={path === href ? "accent" : "textMuted"}
              >
                {label}
              </AppText>
            </Action>
          ))}
        </XStack>
      )}
    </SafeFrame>
  );
}
