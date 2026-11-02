import { useId } from "react";
import type { TextInputProps } from "react-native";
import { Platform } from "react-native";
import { Input, Label, TextArea, YStack, type InputProps } from "tamagui";
export function Field({
  label,
  value,
  onChange,
  secure = false,
  multiline = false,
  keyboardType,
  autoComplete,
  autoCapitalize = "none",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  secure?: boolean;
  multiline?: boolean;
  keyboardType?: InputProps["keyboardType"];
  autoComplete?: TextInputProps["autoComplete"];
  autoCapitalize?: TextInputProps["autoCapitalize"];
  disabled?: boolean;
}) {
  const id = useId();
  const Control = multiline ? TextArea : Input;
  return (
    <YStack marginBottom="3" minWidth={0} opacity={disabled ? 0.6 : 1}>
      <Label htmlFor={id} color="textLabel" fontSize="body" marginBottom="1.5">
        {label}
      </Label>
      <Control
        id={id}
        {...(Platform.OS === "web" ? { disabled } : { editable: !disabled })}
        aria-label={label}
        type={
          secure
            ? "password"
            : keyboardType === "email-address"
              ? "email"
              : "text"
        }
        size={false}
        borderWidth="1px"
        borderColor={{ default: "borderColor", focus: "focusRing" }}
        borderRadius="control"
        padding="13px"
        minHeight={multiline ? "90px" : "48px"}
        textAlignVertical={multiline ? "top" : "center"}
        color="color"
        backgroundColor="background"
        fontSize="control"
        value={value}
        onChangeText={onChange}
        secureTextEntry={secure}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        keyboardType={keyboardType}
        placeholderTextColor="textPlaceholder"
      />
    </YStack>
  );
}
