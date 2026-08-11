import { USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import { tokenStorage } from "@/shared/api/tokenStorage";
import type { RegisterResult, TokenPair, UserInfo } from "@/shared/api/types";
import { MOCK_USERS } from "./mock";

function mockTokenPair(userId: number, playerId: number | null): TokenPair {
  return {
    accessToken: `mock-access-${userId}-${Date.now()}`,
    refreshToken: `mock-refresh-${userId}-${Date.now()}`,
    userId,
    playerId,
  };
}

export async function loginApi(email: string, password: string): Promise<TokenPair> {
  if (USE_MOCK) {
    const user = MOCK_USERS.find((candidate) => candidate.email === email && candidate.password === password);
    if (!user) throw new Error("Invalid email or password.");
    return mockTokenPair(user.id, user.playerId);
  }
  return apiPost<TokenPair>("/api/v1/auth/login", { email, password }, { auth: false });
}

export async function registerApi(email: string, password: string, nickname: string): Promise<RegisterResult> {
  if (USE_MOCK) {
    if (MOCK_USERS.some((user) => user.email === email)) throw new Error("Email is already registered.");
    const user = {
      id: Math.max(...MOCK_USERS.map(({ id }) => id)) + 1,
      email,
      password,
      nickname,
      status: "ACTIVE",
      role: "user" as const,
      playerId: null,
    };
    MOCK_USERS.push(user);
    return { requiresVerification: false, tokenPair: mockTokenPair(user.id, null) };
  }
  return apiPost<RegisterResult>("/api/v1/auth/register", { email, password, nickname }, { auth: false });
}

export async function refreshApi(refreshToken: string): Promise<TokenPair> {
  if (USE_MOCK) {
    const session = tokenStorage.read();
    if (!session) throw new Error("Authentication has expired.");
    return mockTokenPair(session.userId, session.playerId);
  }
  return apiPost<TokenPair>("/api/v1/auth/refresh", { refreshToken }, { auth: false, retry: false });
}

export async function getMeApi(): Promise<UserInfo> {
  if (USE_MOCK) {
    const session = tokenStorage.read();
    const user = MOCK_USERS.find((candidate) => candidate.id === session?.userId);
    if (!session || !user) throw new Error("Authentication has expired.");
    return {
      user: { id: user.id, email: user.email, nickname: user.nickname, status: user.status, role: user.role },
      player: { exists: session.playerId !== null, playerId: session.playerId },
      ui: { nextActions: session.playerId === null ? ["LINK_START"] : [], badges: { notifications: 0, pendingRewards: 0 } },
    };
  }
  return apiGet<UserInfo>("/api/v1/users/me");
}
