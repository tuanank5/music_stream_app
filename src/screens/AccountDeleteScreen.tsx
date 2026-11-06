import { useState } from "react";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { backendPatch } from "../services/backendService";
import {
  AppText,
  Button,
  ErrorText,
  ModalPanel,
  Page,
} from "../components/ui/index";
import { BackButton } from "../components/ui/BackButton";

export default function AccountDeleteScreen() {
  const auth = useAuth(),
    action = useAction();
  const [confirming, setConfirming] = useState(false);
  return (
    <Page
      title="Xóa tài khoản"
      contentWidth="form"
      titleLeading={
        <BackButton inline fallback="/account" disabled={action.busy} />
      }
    >
      <AppText>
        Thao tác này sẽ vô hiệu hóa tài khoản của bạn. Bạn sẽ không thể đăng
        nhập lại.
      </AppText>
      <Button
        title="Xóa tài khoản"
        variant="danger"
        disabled={action.busy}
        onPress={() => setConfirming(true)}
      />
      {!confirming ? <ErrorText message={action.error} /> : null}
      {confirming ? (
        <ModalPanel
          open
          title="Xóa tài khoản"
          description="Thao tác này sẽ vô hiệu hóa tài khoản của bạn."
          onClose={() => {
            if (!action.busy) setConfirming(false);
          }}
        >
          <ErrorText message={action.error} />
          <Button
            title="Xóa tài khoản"
            variant="danger"
            loading={action.busy}
            onPress={() =>
              void action.run(async () => {
                await backendPatch("/me/deactivate", {});
                await auth.logout();
                router.replace("/");
              })
            }
          />
        </ModalPanel>
      ) : null}
    </Page>
  );
}
