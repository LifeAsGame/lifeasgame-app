"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { loginApi } from "@/lib/api/endpoints/auth.api";
import type { AuthUser } from "@/lib/api/types";

type AuthContextValue = {
  currentUser: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("lag_auth_user");
      if (stored) {
        setCurrentUser(JSON.parse(stored) as AuthUser);
      }
    } catch {
      // ignore parse errors
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginApi(email, password);
    setCurrentUser(user);
    localStorage.setItem("lag_auth_user", JSON.stringify(user));
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    localStorage.removeItem("lag_auth_user");
  }, []);

  const value = useMemo(
    () => ({ currentUser, login, logout, isLoading }),
    [currentUser, login, logout, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
