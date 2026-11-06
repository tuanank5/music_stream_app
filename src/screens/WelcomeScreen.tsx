import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import {
  AppImage,
  AppIcon,
  AppText,
  Button,
  ErrorText,
} from "../components/ui/index";

export default function WelcomeScreen({ error }: { error: string }) {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="welcomeBackground">
      <AppImage
        source={require("../../assets/images/Launch Screen/Image 30.png")}
        resizeMode="cover"
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
      />
      <YStack position="absolute" top={insets.top + 36} alignSelf="center">
        <AppIcon name="waveform" color="white" size={64} />
      </YStack>
      <YStack
        flex={1}
        backgroundColor="welcomeOverlay"
        padding={25}
        paddingTop={25 + insets.top}
        paddingBottom={25 + insets.bottom}
        paddingLeft={25 + insets.left}
        paddingRight={25 + insets.right}
        justifyContent="flex-end"
      >
        <AppText
          fontSize={36}
          lineHeight="hero"
          fontWeight="800"
          color="white"
          textAlign="center"
          marginBottom="7.5"
        >
          Your music{"\n"}Your artists
        </AppText>
        <ErrorText message={error} />
        <Button
          title="Tạo tài khoản"
          onPress={() => router.push("/register")}
        />
        <Button
          title="Tôi đã có tài khoản"
          variant="secondary"
          onPress={() => router.push("/login")}
        />
      </YStack>
    </YStack>
  );
}
