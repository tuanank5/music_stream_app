import { Switch } from "tamagui";
export function Toggle({
  value,
  onValueChange,
  label,
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <Switch
      aria-label={label}
      checked={value}
      onCheckedChange={onValueChange}
      backgroundColor={value ? "accent" : "borderColor"}
    >
      <Switch.Thumb backgroundColor="onPrimary" />
    </Switch>
  );
}
