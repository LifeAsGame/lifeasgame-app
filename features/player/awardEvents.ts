export const AWARD_SOURCE_EVENT = "lag:award-source-committed";
export const AWARD_CHANGED_EVENT = "lag:award-read-changed";

export function awardSourceCommitted() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AWARD_SOURCE_EVENT));
}

export function awardReadChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AWARD_CHANGED_EVENT));
}
