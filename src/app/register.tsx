import React, { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { useAction } from "../hooks/useAction";
import { Button, ErrorText, Field, Page, ui } from "../components/UI";
import { resetPassword } from "../services/authService";
import { notify } from "../utils/feedback";

export default function RegisterScreen() {
  const auth = useAuth(),
    a = useAction();
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState("");
  return (
    <Page title="Tạo tài khoản">
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
      <Button title="Quay lại" secondary onPress={() => router.replace("/")} />
    </Page>
  );
}
