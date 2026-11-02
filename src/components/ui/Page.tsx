import React from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { ScrollView, YStack, styled, type GetProps } from "tamagui";
import { ScreenHeader } from "./ScreenHeader";
const KeyboardFrame = styled(KeyboardAvoidingView, {
  displayName: "KeyboardFrame",
  flex: 1,
});
export const PageContent = styled(YStack, {
  displayName: "PageContent",
  width: "100%",
  minWidth: 0,
  maxWidth: "1000px",
  alignSelf: "center",
});
type PageProps = {
  title?: string;
  titleLeading?: React.ReactNode;
  children: React.ReactNode;
  contentWidth?: "form" | "reading" | "full";
  scroll?: boolean;
  keyboardAvoiding?: boolean;
};
export function Page({
  title,
  titleLeading,
  children,
  contentWidth = "full",
  scroll = true,
  keyboardAvoiding = false,
}: PageProps) {
  const content = (
    <PageContent
      padding="gutter"
      paddingBottom="pageBottom"
      maxWidth={
        contentWidth === "form"
          ? "480px"
          : contentWidth === "reading"
            ? "820px"
            : "1000px"
      }
      flex={scroll ? undefined : 1}
    >
      {title ? <ScreenHeader title={title} leading={titleLeading} /> : null}
      {children}
    </PageContent>
  );
  const body = scroll ? (
    <ScrollView
      flex={1}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={{ flexGrow: 1 }}
    >
      {content}
    </ScrollView>
  ) : (
    content
  );
  return (
    <YStack
      flex={1}
      minHeight={0}
      overflow="hidden"
      backgroundColor="background"
    >
      {keyboardAvoiding ? (
        <KeyboardFrame behavior={Platform.OS === "ios" ? "padding" : "height"}>
          {body}
        </KeyboardFrame>
      ) : (
        body
      )}
    </YStack>
  );
}
export type PageContentProps = GetProps<typeof PageContent>;
