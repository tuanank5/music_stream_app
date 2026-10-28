import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { Loading, Page } from "./UI";
import { Text } from "react-native";
export default function Guard({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (!auth.user) return <Redirect href="/" />;
  if (admin && !auth.isAdmin)
    return (
      <Page title="Không đủ quyền">
        <Text>Chỉ quản trị viên được sử dụng màn hình này.</Text>
      </Page>
    );
  return <>{children}</>;
}
