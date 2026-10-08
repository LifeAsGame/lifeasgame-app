import type { TokenPair } from "./types";

export const AUTH_EXPIRED_EVENT = "lag:auth-expired";
export const TOKEN_CHANGED_EVENT = "lag:token-changed";
export const TOKEN_STORAGE_KEY = "lag_auth_session";
export const DEMO_TOKEN_STORAGE_KEY = "lag_demo_actor_session";
let generation = 0;

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
    const raw = window.sessionStorage.getItem(DEMO_TOKEN_STORAGE_KEY) ?? window.localStorage.getItem(TOKEN_STORAGE_KEY);
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
  generation += 1;
  window.sessionStorage.removeItem(DEMO_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem("lag_demo_state");
  window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

function writeDemo(session: TokenPair): void {
  if (typeof window === "undefined") return;
  generation += 1;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.sessionStorage.setItem(DEMO_TOKEN_STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

function replace(session: TokenPair): void {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(DEMO_TOKEN_STORAGE_KEY)) writeDemo(session);
  else write(session);
}

function clear(): void {
  if (typeof window === "undefined") return;
  generation += 1;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event(TOKEN_CHANGED_EVENT));
}

export const tokenStorage = { read, write, writeDemo, replace, clear, generation: () => generation };
