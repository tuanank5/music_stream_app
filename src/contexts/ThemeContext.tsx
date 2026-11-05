import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";
type Preference = "system" | "light" | "dark";
const KEY = "music-stream:theme:v1";
const Context = createContext<{
  theme: "light" | "dark";
  preference: Preference;
  error: string;
  setPreference: (value: Preference) => void;
} | null>(null);
export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<Preference>("system");
  const [error, setError] = useState("");
  const revision = useRef(0),
    writes = useRef(Promise.resolve());
  useEffect(() => {
    let live = true;
    const initial = revision.current;
    AsyncStorage.getItem(KEY)
      .then((value) => {
        if (
          live &&
          revision.current === initial &&
          ["system", "light", "dark"].includes(value || "")
        )
          setPreference(value as Preference);
      })
      .catch(() => {
        if (live) setError("Không đọc được cài đặt giao diện.");
      });
    return () => {
      live = false;
    };
  }, []);
  const change = (value: Preference) => {
    revision.current++;
    setPreference(value);
    setError("");
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(KEY, value))
      .catch(() =>
        setError("Không lưu được cài đặt giao diện. Vui lòng thử lại."),
      );
  };
  const theme =
    preference === "system"
      ? system === "dark"
        ? "dark"
        : "light"
      : preference;
  return (
    <Context.Provider
      value={{ theme, preference, error, setPreference: change }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAppTheme() {
  const value = useContext(Context);
  if (!value) throw new Error("Thiếu AppThemeProvider");
  return value;
}
