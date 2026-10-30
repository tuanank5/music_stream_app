import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getFirebaseAuth } from "../services/firebase";
import * as service from "../services/authService";
import { errorMessage } from "../utils/feedback";
type AuthValue = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  error: string;
  register: typeof service.register;
  login: typeof service.login;
  logout: typeof service.logout;
  refresh: () => Promise<void>;
};
const Context = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [isAdmin, setAdmin] = useState(false),
    [error, setError] = useState("");
  const [, force] = useState(0);
  async function refresh() {
    const u = getFirebaseAuth().currentUser;
    if (!u) return;
    await u.reload();
    const t = await u.getIdTokenResult(true);
    if (getFirebaseAuth().currentUser?.uid === u.uid) {
      setUser(u);
      setAdmin(t.claims.admin === true);
      force((v) => v + 1);
    }
  }
  useEffect(() => {
    let live = true;
    let generation = 0;
    const stop = onAuthStateChanged(getFirebaseAuth(), (u) => {
      const id = ++generation;
      setUser(u);
      setAdmin(false);
      setError("");
      if (!u) {
        setLoading(false);
        return;
      }
      setLoading(true);
      service
        .ensureProfile()
        .then(() => u.getIdTokenResult())
        .then((token) => {
          if (live && id === generation) setAdmin(token.claims.admin === true);
        })
        .catch((e) => {
          if (live && id === generation) setError(errorMessage(e));
        })
        .finally(() => {
          if (live && id === generation) setLoading(false);
        });
    });
    return () => {
      live = false;
      stop();
    };
  }, []);
  return (
    <Context.Provider
      value={{
        user,
        loading,
        isAdmin,
        error,
        register: service.register,
        login: service.login,
        logout: service.logout,
        refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const c = useContext(Context);
  if (!c) throw new Error("Thiếu AuthProvider");
  return c;
}
