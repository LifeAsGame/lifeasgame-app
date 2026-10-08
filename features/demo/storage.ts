import { tokenStorage } from "@/shared/api/tokenStorage";
import type { DemoActivation, DemoActor, DemoRun } from "./api";

const STATE_KEY = "lag_demo_state";
const ATTEMPT_KEY = "lag_demo_attempt";
const INTENT_KEY = "lag_demo_start_intent";

export type DemoState = { run: DemoRun | null; actor: DemoActor; tokens: Partial<Record<DemoActor, DemoActivation>>; peer?: boolean };
export type DemoAttempt = { key: string; proof: string; expiresAt: string };

export const demoStorage = {
  read(): DemoState | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.sessionStorage.getItem(STATE_KEY);
      return raw ? JSON.parse(raw) as DemoState : null;
    } catch { return null; }
  },
  write(state: DemoState) { window.sessionStorage.setItem(STATE_KEY, JSON.stringify(state)); },
  clear() {
    window.sessionStorage.removeItem(STATE_KEY);
    window.sessionStorage.removeItem(ATTEMPT_KEY);
    window.sessionStorage.removeItem(INTENT_KEY);
    tokenStorage.clear();
  },
  attempt(): DemoAttempt | null {
    try { const raw = window.sessionStorage.getItem(ATTEMPT_KEY); return raw ? JSON.parse(raw) as DemoAttempt : null; }
    catch { return null; }
  },
  saveAttempt(attempt: DemoAttempt) { window.sessionStorage.setItem(ATTEMPT_KEY, JSON.stringify(attempt)); },
  clearAttempt() { window.sessionStorage.removeItem(ATTEMPT_KEY); },
  requestStart() { window.sessionStorage.setItem(INTENT_KEY, "1"); },
  consumeStart() { const yes = window.sessionStorage.getItem(INTENT_KEY) === "1"; window.sessionStorage.removeItem(INTENT_KEY); return yes; },
};
