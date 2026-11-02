import type { ReactNode } from "react";
import { XStack } from "tamagui";
import { PageTitle } from "./Typography";

export function ScreenHeader({
  title,
  leading,
  trailing,
}: {
  title: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <XStack alignItems="center" gap="3" marginBottom="4" minWidth={0}>
      {leading}
      <PageTitle flex={1} minWidth={0} marginVertical={0}>
        {title}
      </PageTitle>
      {trailing}
    </XStack>
  );
}
