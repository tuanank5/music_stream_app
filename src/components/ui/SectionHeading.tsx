import { XStack } from "tamagui";
import { Action } from "./IconButton";
import { AppText, SectionTitle } from "./Typography";
export function SectionHeading({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <XStack
      alignItems="center"
      justifyContent="space-between"
      gap="3"
      marginTop="section"
      marginBottom="3"
    >
      <SectionTitle flex={1} marginVertical={0}>
        {title}
      </SectionTitle>
      {onPress ? (
        <Action
          onPress={onPress}
          padding="2"
          aria-label={`Xem tất cả ${title}`}
        >
          <AppText variant="caption">See all</AppText>
        </Action>
      ) : null}
    </XStack>
  );
}
