import { YStack, styled } from "tamagui";
// Layout pressables must not inherit Button's skin, theme or text sizing.
export const IconButton = styled(YStack, {
  displayName: "IconButton",
  role: "button",
  padding: "2",
  minWidth: "44px",
  minHeight: "44px",
  flexShrink: 0,
  backgroundColor: "transparent",
  borderRadius: "pill",
  borderWidth: 0,
  alignItems: "center",
  justifyContent: "center",
  opacity: { default: 1, press: 0.6, disabled: 0.4 },
  variants: {
    tone: {
      plain: {},
      play: { width: "52px", height: "52px", backgroundColor: "contrast" },
    },
  } as const,
  defaultVariants: { tone: "plain" },
});
// Cards and rows own their content geometry; onPress keeps native press behavior.
export const Action = styled(YStack, {
  displayName: "Action",
  role: "button",
  padding: 0,
  minWidth: 0,
  flexShrink: 0,
  minHeight: "44px",
  alignItems: "stretch",
  justifyContent: "flex-start",
  flexDirection: "column",
  backgroundColor: "transparent",
  borderWidth: 0,
  borderRadius: 0,
  opacity: { default: 1, press: 0.75, disabled: 0.4 },
});
