import Guard from "../components/Guard";
import React, { useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { saveProfile } from "../services/authService";
import { Button, ErrorText, Field, Page, ui } from "../components/UI";
import { useAction } from "../hooks/useAction";
import { notify } from "../utils/feedback";

export default function Route() {
  const auth = useAuth(),
    a = useAction();
  const [name, setName] = useState(auth.user?.displayName ?? ""),
    [photo, setPhoto] = useState(auth.user?.photoURL ?? "");
  return (
    <Guard>
      <Page title="Profile">
        <Text style={ui.muted}>{auth.user?.email}</Text>
        <Text style={ui.small}>UID: {auth.user?.uid}</Text>
        <Text style={ui.heading}>
          {auth.isAdmin ? "Quản trị viên" : "Người dùng"}
        </Text>
        <Field label="Tên hiển thị" value={name} onChange={setName} />
        <Field
          label="URL ảnh đại diện (HTTPS, không bắt buộc)"
          value={photo}
          onChange={setPhoto}
        />
        <ErrorText message={a.error} />
        <Button
          title="Lưu hồ sơ"
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              await saveProfile(name, photo);
              await auth.refresh();
              notify("Đã lưu hồ sơ.");
            })
          }
        />
        <Button
          title="Làm mới quyền tài khoản"
          secondary
          disabled={a.busy}
          onPress={() => void a.run(auth.refresh)}
        />
        {auth.isAdmin && (
          <Button
            title="Quản trị bài hát / nghệ sĩ"
            onPress={() => router.push("/admin")}
          />
        )}
        <Button
          title="Đăng xuất"
          secondary
          disabled={a.busy}
          onPress={() =>
            void a.run(async () => {
              await auth.logout();
              router.replace("/");
            })
          }
        />
      </Page>
    </Guard>
  );
}
