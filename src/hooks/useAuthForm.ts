import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { resetPassword } from "../services/authService";
import { notify } from "../utils/feedback";
import { useAction } from "./useAction";

export function useAuthForm(mode: "login" | "register") {
  const auth = useAuth();
  const action = useAction();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    confirm,
    setConfirm,
    busy: action.busy,
    error: action.error,
    submit: () =>
      action.run(async () => {
        if (mode === "login") {
          await auth.login(email, password);
          return;
        }
        const result = await auth.register(name, email, password, confirm);
        if (!result.profileSaved)
          notify(
            "Tài khoản đã tạo, nhưng hồ sơ chưa lưu. Bạn có thể lưu lại trong Hồ sơ.",
          );
        await auth.refresh();
      }),
    resetPassword: () =>
      action.run(async () => {
        await resetPassword(email);
        notify("Nếu email phù hợp, hướng dẫn đặt lại mật khẩu sẽ được gửi.");
      }),
  };
}
