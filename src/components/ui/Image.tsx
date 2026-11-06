import { Image as NativeImage, Platform } from "react-native";
import { Image, type GetProps } from "tamagui";
import { isLocalMedia, audioSourceUri } from "../../utils/audioSource";
import { getFirebaseRuntime } from "../../services/firebase/config";
type ImageProps = GetProps<typeof Image>;
// v3 uses src on web; preserve React Native sources (including bundled assets).
export function AppImage({
  source: originalSource,
  resizeMode,
  accessibilityLabel,
  ...props
}: ImageProps) {
  const source =
    originalSource &&
    typeof originalSource === "object" &&
    !Array.isArray(originalSource) &&
    "uri" in originalSource &&
    typeof originalSource.uri === "string" &&
    isLocalMedia(originalSource.uri)
      ? {
          ...originalSource,
          uri: audioSourceUri(originalSource.uri, getFirebaseRuntime()) || "",
        }
      : originalSource;
  if (Platform.OS !== "web")
    return (
      <Image
        {...props}
        source={source}
        resizeMode={resizeMode}
        accessibilityLabel={accessibilityLabel}
      />
    );
  const asset =
    typeof source === "number"
      ? NativeImage.resolveAssetSource?.(source)
      : Array.isArray(source)
        ? source[0]
        : source;
  const src = asset && typeof asset === "object" ? asset.uri : undefined;
  const objectFit =
    resizeMode === "center"
      ? "scale-down"
      : resizeMode === "stretch"
        ? "fill"
        : resizeMode === "contain"
          ? "contain"
          : "cover";
  return (
    <Image
      {...props}
      alt={props.alt ?? accessibilityLabel ?? ""}
      src={props.src ?? src}
      objectFit={props.objectFit ?? objectFit}
      objectPosition="center"
    />
  );
}
