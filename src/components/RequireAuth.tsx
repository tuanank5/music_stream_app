import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "./ui/index";
export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (!auth.user) return <Redirect href="/" />;
  return <>{children}</>;
}
