import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { AppText, Loading, Page } from "./UI";
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
        <AppText>Chỉ quản trị viên được sử dụng màn hình này.</AppText>
      </Page>
    );
  return <>{children}</>;
}
