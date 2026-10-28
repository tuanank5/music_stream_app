import React, { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { Button, ErrorText, Field, Page, ui } from "../components/UI";
import { resetPassword } from "../services/authService";
import { notify } from "../utils/feedback";
export function LoginScreen() {
  const auth = useAuth(),
    a = useAction();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  return (
    <Page title="Welcome back">
      <Field label="Email" value={email} onChange={setEmail} />
      <Field label="Mật khẩu" value={password} onChange={setPassword} secure />
      <ErrorText message={a.error} />
      <Button
        title={a.busy ? "Đang xử lý..." : "Đăng nhập"}
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            await auth.login(email, password);
            router.replace("/home");
          })
        }
      />
      <Button
        title="Quên mật khẩu"
        secondary
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            await resetPassword(email);
            notify(
              "Nếu email phù hợp, hướng dẫn đặt lại mật khẩu sẽ được gửi.",
            );
          })
        }
      />
      <Text style={ui.link} onPress={() => router.replace("/register")}>
        Chưa có tài khoản? Đăng ký
      </Text>
      <Button
        title="Về Welcome"
        secondary
        onPress={() => router.replace("/")}
      />
    </Page>
  );
}
export function RegisterScreen() {
  const auth = useAuth(),
    a = useAction();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  return (
    <Page title="Create an account">
      <Field label="Tên hiển thị" value={name} onChange={setName} />
      <Field label="Email" value={email} onChange={setEmail} />
      <Field
        label="Mật khẩu (ít nhất 8 ký tự)"
        value={password}
        onChange={setPassword}
        secure
      />
      <Field
        label="Xác nhận mật khẩu"
        value={confirm}
        onChange={setConfirm}
        secure
      />
      <ErrorText message={a.error} />
      <Button
        title={a.busy ? "Đang đăng ký..." : "Đăng ký"}
        disabled={a.busy}
        onPress={() =>
          void a.run(async () => {
            const result = await auth.register(name, email, password, confirm);
            if (!result.profileSaved)
              notify(
                "Tài khoản đã tạo, nhưng hồ sơ Firestore chưa lưu. Kiểm tra Rules rồi lưu lại hồ sơ ở Profile.",
              );
            await auth.refresh();
            router.replace("/home");
          })
        }
      />
      <Text style={ui.link} onPress={() => router.replace("/login")}>
        Đã có tài khoản? Đăng nhập
      </Text>
    </Page>
  );
}
