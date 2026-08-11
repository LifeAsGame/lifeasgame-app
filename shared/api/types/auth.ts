export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
  status: string;
  role?: "user" | "admin";
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  userId: number;
  playerId: number | null;
}

export interface RegisterResult {
  requiresVerification: boolean;
  tokenPair: TokenPair | null;
}
