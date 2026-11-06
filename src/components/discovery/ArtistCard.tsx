import { router } from "expo-router";
import { YStack } from "tamagui";
import { useWindowDimensions } from "react-native";
import type { Artist } from "../../types/domain";
import { Action, MediaTitle } from "../ui/index";
import { ArtistAvatar } from "./ArtistAvatar";
import { FollowButton } from "./FollowButton";
// Thẻ nghệ sĩ trên Home.
export function ArtistCard({
  artist,
  size = 96,
  spacing = 16,
}: {
  artist: Artist;
  size?: number;
  spacing?: number;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <YStack
      width={Math.max(128, size + 24)}
      marginRight={spacing}
      alignItems="center"
    >
      <Action
        role="button"
        aria-label={`Xem nghệ sĩ ${artist.name}`}
        onPress={() =>
          router.push({
            pathname: "/artist",
            params: { id: artist.id },
          })
        }
        alignItems="center"
        width="100%"
      >
        <ArtistAvatar artist={artist} size={size} />

        <YStack
          width="100%"
          minHeight={28 * fontScale}
          justifyContent="center"
          marginTop="2"
        >
          <MediaTitle numberOfLines={1} fontWeight="500" textAlign="center">
            {artist.name}
          </MediaTitle>
        </YStack>
      </Action>

      <FollowButton artistId={artist.id} />
    </YStack>
  );
}
