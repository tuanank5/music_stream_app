import React, { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { Button, ErrorText, Field, Page, ui } from "../components/UI";
import { resetPassword } from "../services/authService";
import { notify } from "../utils/feedback";

export default function LoginScreen() {
  const auth = useAuth(),
    a = useAction();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  return (
    <Page title="Chào mừng bạn quay trở lại">
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
      <Button title="Quay lại" secondary onPress={() => router.replace("/")} />
    </Page>
  );
}
