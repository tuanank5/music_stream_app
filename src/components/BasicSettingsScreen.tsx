import { Switch } from "react-native";
import { XStack } from "tamagui";
import { useAppTheme } from "../contexts/ThemeContext";
import { AppText, Button, ErrorText, Page } from "./UI";
import { BackButton } from "./discovery/BackButton";
export default function BasicSettingsScreen() {
  const { theme, preference, setPreference, error } = useAppTheme();
  return (
    <Page
      title="Cài đặt cơ bản"
      contentWidth="form"
      titleLeading={<BackButton inline fallback="/library" />}
    >
      <XStack justifyContent="space-between" alignItems="center" gap="3">
        <AppText>Giao diện tối</AppText>
        <Switch
          accessibilityLabel="Giao diện tối"
          value={theme === "dark"}
          onValueChange={(dark) => setPreference(dark ? "dark" : "light")}
        />
      </XStack>
      <AppText variant="muted">
        {preference === "system"
          ? "Đang theo giao diện hệ thống."
          : "Đang dùng lựa chọn của bạn."}
      </AppText>
      <Button
        title="Dùng giao diện hệ thống"
        variant="secondary"
        onPress={() => setPreference("system")}
      />
      <ErrorText message={error} />
    </Page>
  );
}
