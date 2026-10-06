import { tokenStorage } from "@/shared/api/tokenStorage";

export const AWARD_SOURCE_EVENT = "lag:award-source-committed";
export const AWARD_CHANGED_EVENT = "lag:award-read-changed";
let lastSourceAt = 0;
let lastSourcePlayerId: number | null = null;

export function awardSourceCommitted() {
  lastSourceAt = Date.now();
  lastSourcePlayerId = tokenStorage.read()?.playerId ?? null;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AWARD_SOURCE_EVENT));
}

export function recentAwardSource() { return Date.now() - lastSourceAt < 3500 && lastSourcePlayerId === (tokenStorage.read()?.playerId ?? null); }

export function awardReadChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AWARD_CHANGED_EVENT));
}
