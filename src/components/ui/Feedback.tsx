import { Spinner, YStack } from "tamagui";
import { AppText } from "./Typography";
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <AppText
      userSelect="text"
      role="alert"
      color="danger"
      backgroundColor="dangerBackground"
      padding="3"
      borderRadius="control"
      marginVertical="2"
    >
      {message}
    </AppText>
  ) : null;
}
export function Loading() {
  return (
    <YStack padding="8" alignItems="center" gap="2.5">
      <Spinner color="primary" aria-label="Đang tải" />
      <AppText variant="muted">Đang tải...</AppText>
    </YStack>
  );
}
export function EmptyState({ message }: { message: string }) {
  return (
    <YStack paddingVertical="4">
      <AppText variant="muted">{message}</AppText>
    </YStack>
  );
}
