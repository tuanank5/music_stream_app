import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider } from "tamagui";
import { tamaguiConfig } from "../../tamagui.config";
import { AppFrame } from "../components/AppFrame";
import { AppText, Page } from "../components/UI";
import { AuthProvider } from "../contexts/AuthContext";
import { DataProvider } from "../contexts/DataContext";
import { PlayerProvider } from "../contexts/PlayerContext";
import { isFirebaseConfigured } from "../services/firebase";
export default function Layout() {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="light">
      <AppLayout />
    </TamaguiProvider>
  );
}
function AppLayout() {
  if (!isFirebaseConfigured())
    return (
      <SafeAreaProvider>
        <Page title="Thiết lập Firebase">
          <AppText variant="muted">
            Sao chép .env.example thành .env ở thư mục gốc, điền đủ 6 giá trị
            Firebase Web app config rồi khởi động lại Expo. Xem START_HERE.md.
          </AppText>
        </Page>
      </SafeAreaProvider>
    );
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <PlayerProvider>
            <AppFrame>
              <Stack screenOptions={{ headerShown: false }}>
                {/* Retain Home and its native scroll views beneath detail routes. */}
                <Stack.Screen name="home" options={{ freezeOnBlur: true }} />
                <Stack.Screen
                  name="player"
                  options={{ animation: "slide_from_bottom" }}
                />
                <Stack.Screen
                  name="comments"
                  options={{
                    presentation: "transparentModal",
                    animation: "slide_from_bottom",
                    contentStyle: { backgroundColor: "transparent" },
                  }}
                />
              </Stack>
            </AppFrame>
          </PlayerProvider>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
