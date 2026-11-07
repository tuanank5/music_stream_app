import { router } from "expo-router";

import { AppText, Button, Page } from "../components/ui/index";

export function PremiumScreen() {
  return (
    <Page title="Premium">
      <AppText variant="muted">
        Premium là tính năng dự kiến phát triển trong tương lai và chưa được hỗ trợ trong phiên bản hiện tại. Bạn vẫn có thể trải nghiệm các chức năng của ứng dụng hoàn toàn miễn phí.
      </AppText>
      <Button
        title="Tiếp tục nghe nhạc"
        onPress={() => router.replace("/home")}
      />
    </Page>
  );
}
