"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { AUTH_EXPIRED_EVENT, tokenStorage } from "@/shared/api/tokenStorage";
import type { AuthUser, RegisterResult, TokenPair, UserInfo } from "@/shared/api/types";
import { getMeApi, loginApi, registerApi } from "./api";
import { activateDemo, currentDemo, type DemoActor, type DemoRun, type DemoActivation } from "@/features/demo/api";
import { demoStorage } from "@/features/demo/storage";

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
  activateDemoActor: (run: DemoRun, actor: DemoActor) => Promise<void>;
  adoptDemoPeer: (activation: DemoActivation) => Promise<void>;
  demoRun: DemoRun | null;
  demoActor: DemoActor | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TokenPair | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [demo, setDemo] = useState(() => demoStorage.read());

  const clearSession = useCallback(() => {
    demoStorage.clear();
    setSession(null);
    setUserInfo(null);
    setDemo(null);
  }, []);

  const reloadMe = useCallback(async () => {
    if (!tokenStorage.read()) {
      clearSession();
      return null;
    }
    const owner = tokenStorage.generation();
    try {
      const demoState = demoStorage.read();
      if (demoState?.run && !demoState.peer) {
        const run = await currentDemo();
        if (owner !== tokenStorage.generation()) return null;
        if (run.runId !== demoState.run.runId || run.status !== "READY") throw new Error("체험이 종료되었거나 만료되었습니다. 새 체험을 시작하세요.");
        demoStorage.write({ ...demoState, run });
        setDemo({ ...demoState, run });
      }
      const info = await getMeApi();
      if (owner !== tokenStorage.generation()) return null;
      if (!info?.user || !info?.player) throw new Error("Invalid current user response.");
      const latestSession = tokenStorage.read();
      if (!latestSession) throw new Error("Authentication has expired.");
      setSession(latestSession);
      setUserInfo(info);
      return info;
    } catch (error) {
      if (owner === tokenStorage.generation()) clearSession();
      throw error;
    }
  }, [clearSession]);

  const adoptDemoPeer = useCallback(async (activation: DemoActivation) => {
    clearSession();
    const state = { run: null, actor: activation.actor, tokens: { [activation.actor]: activation }, peer: true };
    demoStorage.write(state);
    tokenStorage.writeDemo(activation);
    setDemo(state);
    await reloadMe();
  }, [clearSession, reloadMe]);

  const activateDemoActor = useCallback(async (run: DemoRun, actor: DemoActor) => {
    if (run.status !== "READY" || !run.actors.includes(actor)) throw new Error("준비된 역할만 사용할 수 있습니다.");
    const prior = demoStorage.read();
    tokenStorage.clear();
    setSession(null);
    setUserInfo(null);
    const activation = await activateDemo(actor);
    if (activation.runId !== run.runId || activation.actor !== actor) throw new Error("역할 인증 응답이 현재 체험과 일치하지 않습니다.");
    const state = { run, actor, tokens: { ...(prior?.run?.runId === run.runId ? prior.tokens : {}), [actor]: activation } };
    demoStorage.write(state);
    tokenStorage.writeDemo(activation);
    setDemo(state);
    await reloadMe();
  }, [reloadMe]);

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
    clearSession();
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
    () => ({ currentUser, session, playerId, isAuthenticated, isLoading, login, register, logout: clearSession, reloadMe, activateDemoActor, adoptDemoPeer, demoRun: demo?.run ?? null, demoActor: demo?.actor ?? null }),
    [currentUser, session, playerId, isAuthenticated, isLoading, login, register, clearSession, reloadMe, activateDemoActor, adoptDemoPeer, demo],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
