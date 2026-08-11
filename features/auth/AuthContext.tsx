"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AUTH_EXPIRED_EVENT, tokenStorage } from "@/shared/api/tokenStorage";
import type { AuthUser, RegisterResult, TokenPair, UserInfo } from "@/shared/api/types";
import { getMeApi, loginApi, registerApi } from "./api";

export type LoginState = { session: TokenPair; userInfo: UserInfo };

type AuthContextValue = {
  currentUser: AuthUser | null;
  session: TokenPair | null;
  playerId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginState>;
  register: (email: string, password: string, nickname: string) => Promise<RegisterResult>;
  logout: () => void;
  reloadMe: () => Promise<UserInfo | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TokenPair | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    tokenStorage.clear();
    setSession(null);
    setUserInfo(null);
  }, []);

  const reloadMe = useCallback(async () => {
    if (!tokenStorage.read()) {
      clearSession();
      return null;
    }
    try {
      const info = await getMeApi();
      if (!info?.user || !info?.player) throw new Error("Invalid current user response.");
      const latestSession = tokenStorage.read();
      if (!latestSession) throw new Error("Authentication has expired.");
      setSession(latestSession);
      setUserInfo(info);
      return info;
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [clearSession]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        if (tokenStorage.read()) await reloadMe();
      } catch {
        // reloadMe already cleared an invalid or expired session.
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void bootstrap();
    window.addEventListener(AUTH_EXPIRED_EVENT, clearSession);
    return () => {
      active = false;
      window.removeEventListener(AUTH_EXPIRED_EVENT, clearSession);
    };
  }, [clearSession, reloadMe]);

  const login = useCallback(async (email: string, password: string): Promise<LoginState> => {
    const nextSession = await loginApi(email, password);
    tokenStorage.write(nextSession);
    setSession(nextSession);
    try {
      const info = await reloadMe();
      if (!info) throw new Error("Unable to load the current user.");
      return { session: nextSession, userInfo: info };
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [clearSession, reloadMe]);

  const register = useCallback(async (email: string, password: string, nickname: string) => {
    const result = await registerApi(email, password, nickname);
    if (result.tokenPair) {
      tokenStorage.write(result.tokenPair);
      setSession(result.tokenPair);
      await reloadMe();
    }
    return result;
  }, [reloadMe]);

  const currentUser = userInfo?.user ?? null;
  const playerId = userInfo
    ? (userInfo.player.exists ? userInfo.player.playerId : null)
    : session?.playerId ?? null;
  const isAuthenticated = Boolean(session && currentUser);
  const value = useMemo<AuthContextValue>(
    () => ({ currentUser, session, playerId, isAuthenticated, isLoading, login, register, logout: clearSession, reloadMe }),
    [currentUser, session, playerId, isAuthenticated, isLoading, login, register, clearSession, reloadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
