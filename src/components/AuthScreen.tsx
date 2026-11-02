import { Link, router } from "expo-router";
import { useAuthForm } from "../hooks/useAuthForm";
import { BackButton } from "./discovery/BackButton";
import { AppText, Button, ErrorText, Field, Page, TextLink } from "./UI";

export default function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const form = useAuthForm(mode);
  const registering = mode === "register";
  return (
    <Page
      title={registering ? "Tạo tài khoản" : "Chào mừng bạn quay trở lại"}
      titleLeading={<BackButton inline fallback="/" disabled={form.busy} />}
      contentWidth="form"
      keyboardAvoiding
    >
      <AppText variant="muted" marginBottom="5">
        {registering
          ? "Lưu những bài hát yêu thích và tạo không gian âm nhạc của riêng bạn."
          : "Đăng nhập để tiếp tục với âm nhạc của bạn."}
      </AppText>
      {registering ? (
        <Field
          label="Tên hiển thị"
          value={form.name}
          onChange={form.setName}
          autoCapitalize="words"
          autoComplete="name"
          disabled={form.busy}
        />
      ) : null}
      <Field
        label="Email"
        value={form.email}
        onChange={form.setEmail}
        keyboardType="email-address"
        autoComplete="email"
        disabled={form.busy}
      />
      <Field
        label={registering ? "Mật khẩu (ít nhất 8 ký tự)" : "Mật khẩu"}
        value={form.password}
        onChange={form.setPassword}
        secure
        autoComplete={registering ? "new-password" : "current-password"}
        disabled={form.busy}
      />
      {registering ? (
        <Field
          label="Xác nhận mật khẩu"
          value={form.confirm}
          onChange={form.setConfirm}
          secure
          autoComplete="new-password"
          disabled={form.busy}
        />
      ) : null}
      <ErrorText message={form.error} />
      <Button
        title={registering ? "Đăng ký" : "Đăng nhập"}
        loading={form.busy}
        onPress={() =>
          void form.submit().then((success) => {
            if (success) router.replace("/home");
          })
        }
      />
      {!registering ? (
        <Button
          title="Quên mật khẩu"
          variant="secondary"
          disabled={form.busy}
          onPress={() => void form.resetPassword()}
        />
      ) : null}
      <Link
        href={registering ? "/login" : "/register"}
        replace
        asChild
        onPress={(event) => {
          if (form.busy) event.preventDefault();
        }}
      >
        <TextLink>
          {registering
            ? "Đã có tài khoản? Đăng nhập"
            : "Chưa có tài khoản? Đăng ký"}
        </TextLink>
      </Link>
    </Page>
  );
}
