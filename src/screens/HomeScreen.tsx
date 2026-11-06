import { router, useFocusEffect } from "expo-router";
import { ScrollView, XStack, YStack } from "tamagui";
import Artwork from "../components/Artwork";
import HomeDiscovery from "../components/HomeDiscovery";
import SongRow from "../components/SongRow";
import {
  Action,
  AppIcon,
  AppImage,
  AppText,
  Button,
  IconButton,
  SectionHeading,
} from "../components/ui/index";
import { useAuth } from "../contexts/AuthContext";
import { useHomeDiscovery } from "../hooks/useHomeDiscovery";
import { useBackendResource } from "../hooks/useBackendResource";
import { useCallback, useState } from "react";

export default function HomeScreen() {
  const { user } = useAuth();
  const discovery = useHomeDiscovery();
  const profile = useBackendResource<{ avatarUrl: string }>("/me");
  const refreshProfile = profile.refresh;
  useFocusEffect(useCallback(() => refreshProfile(), [refreshProfile]));
  const [muted, setMuted] = useState(false);
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Chào buổi sáng,"
      : hour < 18
        ? "Chào buổi chiều,"
        : "Chào buổi tối,";

  return (
    <ScrollView
      flex={1}
      backgroundColor="background"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <YStack paddingHorizontal="gutter" paddingTop="3">
        <XStack
          alignItems="center"
          justifyContent="space-between"
          marginBottom="section"
        >
          <AppImage
            source={require("../../assets/images/Home - Audio Listing/Image 36.png")}
            width={44}
            height={44}
            resizeMode="contain"
            accessibilityLabel="Music"
          />
          <XStack alignItems="center" gap="2">
            <IconButton
              aria-label={muted ? "Bật thông báo" : "Tắt thông báo"}
              aria-pressed={muted}
              onPress={() => setMuted((value) => !value)}
            >
              <AppIcon name={muted ? "bell-off" : "bell"} color="textMuted" />
            </IconButton>
            <IconButton
              onPress={() => router.push("/profile")}
              aria-label="Mở hồ sơ cá nhân"
            >
              <Artwork
                uri={profile.value?.avatarUrl || user?.photoURL || ""}
                size={36}
                radius={18}
                fallback="person"
              />
            </IconButton>
          </XStack>
        </XStack>
        <AppText variant="muted" fontSize={16}>
          {greeting}
        </AppText>
        <AppText
          fontSize={25}
          lineHeight="34px"
          fontWeight="800"
          marginTop="1"
          marginBottom="4"
        >
          {user?.displayName?.trim() || "Music lover"}
        </AppText>
        <Action
          onPress={() =>
            router.push({ pathname: "/search", params: { autoFocus: "1" } })
          }
          aria-label="Tìm bài hát, nghệ sĩ hoặc Album"
          flexDirection="row"
          alignItems="center"
          gap="3"
          borderWidth={1}
          borderColor="borderColor"
          borderRadius="pill"
          paddingHorizontal="4"
          paddingVertical="3"
        >
          <AppIcon name="search" size={19} />
          <AppText color="textPlaceholder" flex={1}>
            Bạn muốn nghe gì?
          </AppText>
        </Action>
      </YStack>

      <YStack paddingHorizontal="gutter">
        <Button
          title="Làm mới khám phá"
          variant="secondary"
          onPress={discovery.refresh}
        />
      </YStack>
      <HomeDiscovery state={discovery} />

      <YStack paddingHorizontal="gutter">
        {discovery.songs.length > 0 && (
          <>
            <SectionHeading title="Bài hát" />
            {discovery.songs.map((song) => (
              <SongRow key={song.id} song={song} queue={discovery.songs} />
            ))}
          </>
        )}
      </YStack>
    </ScrollView>
  );
}
