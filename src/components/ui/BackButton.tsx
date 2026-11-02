import type { Href } from "expo-router";
import { useBackNavigation } from "../../hooks/useBackNavigation";
import { AppIcon } from "./Icon";
import { IconButton } from "./IconButton";
// Dùng trong trang nghệ sĩ và chart.
export function BackButton({
  fallback = "/home",
  inline = false,
  disabled = false,
}: {
  fallback?: Href;
  inline?: boolean;
  disabled?: boolean;
}) {
  const goBack = useBackNavigation(fallback);
  return (
    <IconButton
      role="button"
      aria-label="Quay lại"
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        goBack();
      }}
      alignSelf="flex-start"
      padding="2"
      marginLeft={-8}
      marginBottom={inline ? 0 : 12}
    >
      <AppIcon name="chevron-back" size={24} color="textMuted" />
    </IconButton>
  );
}
