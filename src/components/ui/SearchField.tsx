import { Platform } from "react-native";
import { Input, XStack } from "tamagui";
import { AppIcon } from "./Icon";
import { IconButton } from "./IconButton";

export function SearchField({
  value,
  onChange,
  autoFocus = false,
  placeholder = "Tìm bài hát, nghệ sĩ, album",
}: {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  return (
    <XStack
      alignItems="center"
      borderWidth={1}
      borderColor="borderColor"
      borderRadius="pill"
      paddingLeft="4"
      minHeight={48}
    >
      <AppIcon name="search" size={20} color="textMuted" />
      <Input
        size={false}
        flex={1}
        minWidth={0}
        borderWidth={0}
        backgroundColor="transparent"
        paddingHorizontal="3"
        paddingVertical="3"
        fontSize="control"
        color="color"
        placeholderTextColor="textPlaceholder"
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        autoCorrect={false}
        {...(Platform.OS === "web"
          ? { autoFocus }
          : { autoFocusNative: autoFocus, showSoftInputOnFocus: true })}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value ? (
        <IconButton aria-label="Xóa từ khóa" onPress={() => onChange("")}>
          <AppIcon name="close" size={18} />
        </IconButton>
      ) : null}
    </XStack>
  );
}
