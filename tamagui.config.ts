import { defaultConfig } from "@tamagui/config/v6";
import { createTamagui } from "tamagui";

export const uiSpacing = { gutter: 20, cardGap: 20 } as const;

export const tamaguiConfig = createTamagui({
  ...defaultConfig,
  fonts: {
    body: {
      ...defaultConfig.fonts.body,
      size: {
        ...defaultConfig.fonts.body.size,
        body: 14,
        caption: 12,
        control: 15,
        title: 27,
        heading: 21,
        hero: 36,
      },
      lineHeight: {
        ...defaultConfig.fonts.body.lineHeight,
        body: 21,
        caption: 18,
        control: 22,
        title: 34,
        heading: 28,
        hero: 44,
      },
    },
    heading: {
      ...defaultConfig.fonts.heading,
      size: {
        ...defaultConfig.fonts.heading.size,
        title: 27,
        heading: 21,
        hero: 36,
      },
      lineHeight: {
        ...defaultConfig.fonts.heading.lineHeight,
        title: 34,
        heading: 28,
        hero: 44,
      },
    },
  },
  tokens: {
    ...defaultConfig.tokens,
    space: {
      ...defaultConfig.tokens.space,
      gutter: uiSpacing.gutter,
      pageBottom: 30,
      section: 28,
      cardGap: uiSpacing.cardGap,
      "4.5": 18,
      "5.5": 22,
      "7.5": 30,
    },
    radius: { ...defaultConfig.tokens.radius, card: 14, control: 12, pill: 24 },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    styleCompat: "react-native",
  },
  themes: {
    dark: {
      ...defaultConfig.themes.dark,
      background: "#15171b",
      color: "#f0f2f5",
      primary: "#e8ebf0",
      onPrimary: "#191b20",
      secondary: "#272b33",
      secondaryText: "#e0e4eb",
      textMuted: "#b0b7c3",
      textLabel: "#c8ced8",
      textPlaceholder: "#929baa",
      borderColor: "#454d5c",
      surface: "#22262e",
      focusRing: "#36d7e5",
      accentSoft: "#16363c",
      artworkOverlay: "#17191e99",
      playerBackground: "#10161a",
      playerMuted: "#c5ccd0",
      playerTrack: "#ffffff45",
      danger: "#ff9ca8",
      dangerBackground: "#46242c",
      contrast: "#191d24",
      artworkBackground: "#303640",
      avatarIcon: "#79a9ac",
      avatarText: "#a3d9dd",
      accent: "#36d7e5",
      overlay: "#000000aa",
      gloss: "#ffffff28",
      welcomeBackground: "#403553",
      welcomeOverlay: "#230c4270",
    },
    light: {
      ...defaultConfig.themes.light,
      background: "#ffffff",
      color: "#22242a",
      primary: "#191b20",
      onPrimary: "#ffffff",
      secondary: "#f3f4f6",
      secondaryText: "#343841",
      textMuted: "#676c76",
      textLabel: "#4c535d",
      textPlaceholder: "#969ba4",
      borderColor: "#ced3da",
      surface: "#f5f6f8",
      focusRing: "#00a9bc",
      accentSoft: "#e8fbfd",
      artworkOverlay: "#17191e99",
      playerBackground: "#10161a",
      playerMuted: "#c5ccd0",
      playerTrack: "#ffffff45",
      danger: "#a32836",
      dangerBackground: "#fff0f2",
      contrast: "#191d24",
      artworkBackground: "#eef1f4",
      avatarIcon: "#79a9ac",
      avatarText: "#39777c",
      accent: "#00bcd4",
      overlay: "#00000088",
      gloss: "#ffffff28",
      welcomeBackground: "#403553",
      welcomeOverlay: "#230c4270",
    },
  },
});

type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default tamaguiConfig;
