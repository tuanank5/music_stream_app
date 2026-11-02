import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useCallback, useMemo } from "react";
import { createBackAction } from "../utils/navigation";

export function useBackNavigation(fallback: Href = "/home") {
  const router = useRouter();
  const action = useMemo(
    () => createBackAction(router, fallback),
    [router, fallback],
  );
  useFocusEffect(
    useCallback(() => {
      action.reset();
    }, [action]),
  );
  return action.go;
}
