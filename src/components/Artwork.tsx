import { useState } from "react";
import { YStack } from "tamagui";
import { AppIcon, AppImage } from "./UI";
export default function Artwork({
  uri,
  size = 54,
  radius = 10,
  height = size,
  fallback = "musical-notes-outline",
}: {
  uri: string;
  size?: number;
  radius?: number;
  height?: number;
  fallback?: "musical-notes-outline" | "person";
}) {
  const [failedUri, setFailedUri] = useState("");
  return (
    <YStack
      width={size}
      flexShrink={0}
      height={height}
      borderRadius={radius}
      overflow="hidden"
      backgroundColor="artworkBackground"
      alignItems="center"
      justifyContent="center"
    >
      {uri && failedUri !== uri ? (
        <AppImage
          source={{ uri }}
          width={size}
          height={height}
          resizeMode="cover"
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <AppIcon
          name={fallback}
          size={Math.max(16, size / 3)}
          color="textMuted"
        />
      )}
    </YStack>
  );
}
