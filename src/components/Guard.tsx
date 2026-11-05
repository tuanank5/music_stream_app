import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "../contexts/AuthContext";
import { Loading } from "./UI";
export default function Guard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  if (auth.loading) return <Loading />;
  if (!auth.user) return <Redirect href="/" />;
  return <>{children}</>;
}
