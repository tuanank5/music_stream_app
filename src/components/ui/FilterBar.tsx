import { ScrollView, XStack } from "tamagui";
import { Action } from "./IconButton";
import { AppText } from "./Typography";

export function FilterBar<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      marginVertical="4"
    >
      <XStack gap="2">
        {options.map((option) => (
          <Action
            key={option.value}
            onPress={() => onChange(option.value)}
            aria-label={option.label}
            aria-pressed={value === option.value}
            justifyContent="center"
            alignItems="center"
            paddingHorizontal="4"
            borderRadius="pill"
            backgroundColor={value === option.value ? "accentSoft" : "surface"}
          >
            <AppText
              color={value === option.value ? "focusRing" : "textMuted"}
              fontWeight={value === option.value ? "700" : "400"}
            >
              {option.label}
            </AppText>
          </Action>
        ))}
      </XStack>
    </ScrollView>
  );
}
