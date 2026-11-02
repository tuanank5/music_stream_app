import { Button as BaseButton, Spinner, styled } from "tamagui";
const ButtonFrame = styled(BaseButton, {
  displayName: "AppButton",
  size: false,
  padding: "3.5",
  minHeight: "48px",
  borderRadius: "pill",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 0,
  gap: "2",
  marginVertical: "1.5",
  borderWidth: 1,
  borderColor: { default: "transparent", focus: "focusRing" },
  opacity: { default: 1, press: 0.75 },
  variants: {
    tone: {
      primary: { backgroundColor: "primary" },
      secondary: { backgroundColor: "secondary" },
      danger: { backgroundColor: "danger" },
    },
  } as const,
  defaultVariants: { tone: "primary" },
});
export function Button({
  title,
  onPress,
  disabled = false,
  variant = "primary",
  loading = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  loading?: boolean;
}) {
  return (
    <ButtonFrame
      role="button"
      aria-label={title}
      aria-busy={loading}
      tone={variant}
      disabled={disabled || loading}
      opacity={{
        default: disabled || loading ? 0.5 : 1,
        press: disabled || loading ? 0.5 : 0.75,
      }}
      onPress={onPress}
    >
      {loading ? (
        <Spinner
          color={variant === "secondary" ? "secondaryText" : "onPrimary"}
        />
      ) : null}
      <BaseButton.Text
        size={false}
        color={variant === "secondary" ? "secondaryText" : "onPrimary"}
        fontSize="control"
        lineHeight="control"
        fontWeight="700"
        textAlign="center"
        style={{ includeFontPadding: false }}
      >
        {title}
      </BaseButton.Text>
    </ButtonFrame>
  );
}
