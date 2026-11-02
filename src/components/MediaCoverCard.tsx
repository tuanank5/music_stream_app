import { YStack } from "tamagui";
import Artwork from "./Artwork";
import { Action, MediaTitle, MediaSubtitle } from "./UI";

export function MediaCoverCard({
  cover,
  width,
  height = width,
  title,
  subtitle,
  onPress,
}: {
  cover: string;
  width: number;
  height?: number;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Action
      position="relative"
      width={width}
      borderRadius={4}
      overflow="hidden"
      onPress={onPress}
      aria-label={`Phát ${title}, ${subtitle}`}
    >
      <Artwork uri={cover} size={width} height={height} radius={4} />
      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        padding="3"
        backgroundColor="artworkOverlay"
      >
        <MediaTitle color="white" numberOfLines={1}>
          {title}
        </MediaTitle>
        <MediaSubtitle color="white" marginTop="1" numberOfLines={1}>
          {subtitle}
        </MediaSubtitle>
      </YStack>
    </Action>
  );
}
