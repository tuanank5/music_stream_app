import { Text, styled } from "tamagui";
export const AppText = styled(Text, {
  displayName: "AppText",
  fontFamily: "body",
  fontSize: "body",
  lineHeight: "body",
  color: "color",
  minWidth: 0,
  flexShrink: 1,
  style: { includeFontPadding: false },
  variants: {
    variant: {
      body: {},
      muted: { color: "textMuted", lineHeight: "body" },
      caption: {
        fontSize: "caption",
        lineHeight: "caption",
        color: "textMuted",
      },
      danger: { color: "danger" },
    },
  } as const,
  defaultVariants: { variant: "body" },
});
// Shared compact card/row copy; individual chart descriptions allow two lines.
// Detail headings/body remain unrestricted so the full name is available there.
export const MediaTitle = styled(AppText, {
  displayName: "MediaTitle",
  fontSize: "body",
  lineHeight: "20px",
  fontWeight: "600",
  numberOfLines: 1,
  ellipsizeMode: "tail",
  alignSelf: "stretch",
});
export const MediaSubtitle = styled(AppText, {
  displayName: "MediaSubtitle",
  fontSize: "caption",
  lineHeight: "caption",
  color: "textMuted",
  numberOfLines: 1,
  ellipsizeMode: "tail",
  alignSelf: "stretch",
});
export const PageTitle = styled(AppText, {
  displayName: "PageTitle",
  fontFamily: "heading",
  fontSize: "title",
  lineHeight: "title",
  fontWeight: "800",
  marginVertical: "3",
});
export const SectionTitle = styled(AppText, {
  displayName: "SectionTitle",
  fontFamily: "heading",
  fontSize: "heading",
  lineHeight: "heading",
  fontWeight: "700",
  marginVertical: "3.5",
});
export const TextLink = styled(AppText, {
  displayName: "TextLink",
  color: "focusRing",
  fontWeight: "600",
  paddingVertical: "3",
  minHeight: "44px",
});
