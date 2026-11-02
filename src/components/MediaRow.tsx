import type { ReactNode } from "react";
import { XStack, YStack } from "tamagui";
import { Action, MediaTitle, MediaSubtitle } from "./UI";

// One width contract for album, playlist and artist rows.
export function MediaRow({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
}: {
  title: string;
  subtitle?: string;
  leading: ReactNode;
  trailing?: ReactNode;
  onPress: () => void;
}) {
  return (
    <XStack alignItems="center" gap="2" marginVertical="2" minWidth={0}>
      <Action
        onPress={onPress}
        aria-label={title}
        flex={1}
        flexShrink={1}
        minWidth={0}
        flexDirection="row"
        alignItems="center"
        gap="3"
      >
        {leading}
        <YStack flex={1} minWidth={0} gap="1">
          <MediaTitle>{title}</MediaTitle>
          {subtitle ? <MediaSubtitle>{subtitle}</MediaSubtitle> : null}
        </YStack>
      </Action>
      {trailing}
    </XStack>
  );
}
