import type { TokenPair } from "./types";

export const AUTH_EXPIRED_EVENT = "lag:auth-expired";
export const TOKEN_STORAGE_KEY = "lag_auth_session";

function isTokenPair(value: unknown): value is TokenPair {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<TokenPair>;
  return (
    typeof session.accessToken === "string" && session.accessToken.length > 0 &&
    typeof session.refreshToken === "string" && session.refreshToken.length > 0 &&
    typeof session.userId === "number" &&
    (typeof session.playerId === "number" || session.playerId === null)
  );
}

function read(): TokenPair | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const session: unknown = JSON.parse(raw);
    if (isTokenPair(session)) return session;
  } catch {
    // Malformed storage is treated as an expired session.
  }
  clear();
  return null;
}

function write(session: TokenPair): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
}

function clear(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const tokenStorage = { read, write, clear };
