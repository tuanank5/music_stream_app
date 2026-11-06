import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { AppText, Button, Page } from "../components/ui/index";

export default function NotFoundScreen() {
  const { user, loading } = useAuth();
  return (
    <Page title="Không tìm thấy trang" contentWidth="form">
      <AppText variant="muted">
        Đường dẫn không tồn tại hoặc trang đã được chuyển sang địa chỉ khác.
      </AppText>
      <Button
        title={user ? "Về trang chủ" : "Về trang bắt đầu"}
        disabled={loading}
        onPress={() => router.replace(user ? "/home" : "/")}
      />
    </Page>
  );
}
