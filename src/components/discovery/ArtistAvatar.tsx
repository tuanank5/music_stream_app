import { useState } from "react";
import { YStack } from "tamagui";
import type { Artist } from "../../types/domain";
import { AppIcon, AppImage, AppText } from "../ui/index";
// Ảnh chân dung nghệ sĩ.
export function ArtistAvatar({
  artist,
  size = 100,
}: {
  artist: Artist;
  size?: number;
}) {
  const [failedUri, setFailedUri] = useState("");
  const initials = artist.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <YStack
      overflow="hidden"
      backgroundColor="artworkBackground"
      alignItems="center"
      justifyContent="center"
      width={size}
      flexShrink={0}
      height={size}
      borderRadius={size / 2}
    >
      {artist.imageUrl && failedUri !== artist.imageUrl ? (
        <AppImage
          source={{ uri: artist.imageUrl }}
          width={size}
          height={size}
          resizeMode="cover"
          onError={() => setFailedUri(artist.imageUrl)}
        />
      ) : (
        <>
          <AppIcon name="person" size={size * 0.37} color="avatarIcon" />

          <AppText
            numberOfLines={1}
            color="avatarText"
            fontWeight="700"
            fontSize={Math.max(10, size * 0.13)}
            lineHeight={`${Math.round(Math.max(10, size * 0.13) * 1.4)}px`}
          >
            {initials}
          </AppText>
        </>
      )}
    </YStack>
  );
}
