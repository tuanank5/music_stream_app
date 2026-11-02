import React, { useEffect } from "react";
import { BackHandler, KeyboardAvoidingView, Platform } from "react-native";
import { Dialog, ScrollView, styled } from "tamagui";
const KeyboardFrame = styled(KeyboardAvoidingView, {
  width: "100%",
  height: "100%",
  alignItems: "center",
  justifyContent: "center",
});
export function ModalPanel({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open || Platform.OS === "web") return;
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => listener.remove();
  }, [open, onClose]);
  return (
    <Dialog
      modal
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.FocusScope loop trapped>
        <Dialog.Portal>
          <Dialog.Overlay backgroundColor="overlay" onPress={onClose} />
          <KeyboardFrame
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            pointerEvents="box-none"
          >
            <Dialog.Content
              width="90%"
              maxWidth="480px"
              maxHeight="85%"
              padding="5"
              borderRadius="card"
              backgroundColor="background"
              gap="3"
              minWidth={0}
            >
              <Dialog.Title
                color="color"
                fontSize="heading"
                lineHeight="heading"
                fontWeight="700"
              >
                {title}
              </Dialog.Title>
              <Dialog.Description
                color="textMuted"
                fontSize="body"
                lineHeight="body"
              >
                {description}
              </Dialog.Description>
              <ScrollView
                flexShrink={1}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {children}
              </ScrollView>
            </Dialog.Content>
          </KeyboardFrame>
        </Dialog.Portal>
      </Dialog.FocusScope>
    </Dialog>
  );
}
