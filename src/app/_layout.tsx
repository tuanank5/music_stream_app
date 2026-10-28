import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "../contexts/AuthContext";
import { DataProvider } from "../contexts/DataContext";
import { PlayerProvider } from "../contexts/PlayerContext";
import { AppFrame } from "../components/AppFrame";
import { isFirebaseConfigured } from "../services/firebase";
import { Page, ui } from "../components/UI";
import { Text } from "react-native";
export default function Layout() {
  if (!isFirebaseConfigured())
    return (
      <SafeAreaProvider>
        <Page title="Thiết lập Firebase">
          <Text style={ui.muted}>
            Sao chép .env.example thành .env ở thư mục gốc, điền đủ 6 giá trị
            Firebase Web app config rồi khởi động lại Expo. Xem START_HERE.md.
          </Text>
        </Page>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <PlayerProvider>
            <AppFrame>
              <Stack screenOptions={{ headerShown: false }} />
            </AppFrame>
          </PlayerProvider>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
