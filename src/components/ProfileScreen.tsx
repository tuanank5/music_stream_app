import { router } from "expo-router";
import { YStack } from "tamagui";
import { useProfileForm } from "../hooks/useProfileForm";
import Artwork from "./Artwork";
import { BackButton } from "./discovery/BackButton";
import { AppText, Button, ErrorText, Field, Page, SectionTitle } from "./UI";

export default function ProfileScreen() {
  const form = useProfileForm();
  return (
    <Page
      title="Hồ sơ"
      titleLeading={
        <BackButton inline fallback="/library" disabled={form.busy} />
      }
      contentWidth="form"
      keyboardAvoiding
    >
      <YStack alignItems="center" marginBottom="4">
        <Artwork uri={form.photo} size={96} radius={48} fallback="person" />
      </YStack>
      <AppText variant="muted">{form.user?.email}</AppText>
      <AppText variant="caption" userSelect="text">
        UID: {form.user?.uid}
      </AppText>
      <SectionTitle>
        {form.isAdmin ? "Quản trị viên" : "Người dùng"}
      </SectionTitle>
      <Field
        label="Tên hiển thị"
        value={form.name}
        onChange={form.setName}
        disabled={form.busy}
      />
      <Field
        label="URL ảnh đại diện (HTTPS, không bắt buộc)"
        value={form.photo}
        onChange={form.setPhoto}
        disabled={form.busy}
      />
      <ErrorText message={form.error} />
      <Button
        title="Lưu hồ sơ"
        loading={form.busy}
        onPress={() => void form.save()}
      />
      <Button
        title="Làm mới quyền tài khoản"
        variant="secondary"
        disabled={form.busy}
        onPress={() => void form.refresh()}
      />
      {form.isAdmin ? (
        <Button
          title="Quản trị bài hát / nghệ sĩ"
          disabled={form.busy}
          onPress={() => router.push("/admin")}
        />
      ) : null}
      <Button
        title="Đăng xuất"
        variant="secondary"
        disabled={form.busy}
        onPress={() =>
          void form.logout().then((success) => {
            if (success) router.replace("/");
          })
        }
      />
    </Page>
  );
}
