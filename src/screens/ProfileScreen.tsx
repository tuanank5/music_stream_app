import { YStack } from "tamagui";
import { useProfileForm } from "../hooks/useProfileForm";
import Artwork from "../components/Artwork";
import { BackButton } from "../components/ui/BackButton";
import {
  AppText,
  Button,
  ErrorText,
  Field,
  Page,
  IconButton,
  AppIcon,
} from "../components/ui/index";

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
        <IconButton
          aria-label="Đổi ảnh đại diện"
          disabled={form.busy}
          onPress={() => void form.pickAvatar()}
          position="absolute"
          bottom={0}
          marginLeft={76}
          backgroundColor="surface"
          borderRadius={22}
        >
          <AppIcon name="edit" size={20} />
        </IconButton>
      </YStack>
      <AppText variant="muted">Địa chỉ email: {form.user?.email}</AppText>
      <AppText variant="muted">
        Follower: {form.followerCount} · Following: {form.followingCount}
      </AppText>
      <YStack marginTop="2">
        <Field
          label="Tên hiển thị"
          value={form.name}
          onChange={form.setName}
          disabled={form.busy}
        />
      </YStack>
      <Field
        label="Tiểu sử"
        value={form.biography}
        onChange={form.setBiography}
        multiline
        disabled={form.busy}
      />
      <ErrorText message={form.error} />
      <Button
        title="Lưu hồ sơ"
        loading={form.busy}
        onPress={() => void form.save()}
      />
      <Button
        title="Đăng xuất"
        variant="secondary"
        disabled={form.busy}
        onPress={() => void form.logout()}
      />
    </Page>
  );
}
