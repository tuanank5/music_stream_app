import { router } from "expo-router";

import { AppText, Button, Page } from "../components/ui/index";

export function PremiumScreen() {
  return (
    <Page title="Premium — giao diện giới thiệu">
      <AppText variant="muted">
        Phiên bản học tập này không có thanh toán, gói thuê bao hoặc tải
        offline. Bạn không cần mua Premium để sử dụng các chức năng MVP.
      </AppText>
      <Button
        title="Tiếp tục nghe nhạc"
        onPress={() => router.replace("/home")}
      />
    </Page>
  );
}
