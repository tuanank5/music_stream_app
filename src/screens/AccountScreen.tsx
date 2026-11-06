import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import {
  Action,
  AppText,
  Button,
  ErrorText,
  Page,
} from "../components/ui/index";
import { BackButton } from "../components/ui/BackButton";

export default function AccountScreen() {
  const auth = useAuth();
  const action = useAction();
  return (
    <Page
      title="Tài khoản"
      contentWidth="form"
      titleLeading={
        <BackButton inline fallback="/library" disabled={action.busy} />
      }
    >
      <AppText>Địa chỉ email: {auth.user?.email}</AppText>
      <ErrorText message={action.error} />
      <Button
        title="Đăng xuất"
        variant="secondary"
        loading={action.busy}
        onPress={() =>
          void action.run(async () => {
            await auth.logout();
            router.replace("/");
          })
        }
      />
      <Action
        disabled={action.busy}
        onPress={() => router.push("/account-delete")}
        paddingVertical="3"
        aria-label="Xóa tài khoản"
      >
        <AppText color="danger">Xóa tài khoản</AppText>
      </Action>
    </Page>
  );
}
