"use client";

import { useSyncExternalStore } from "react";
import { MAIN_NAV_ITEMS, SUBMENUS_BY_MAIN } from "@/entities/nav";
import type { MainNavId } from "@/entities/nav";

const LOCATION_EVENT = "lag:consumer-location";
export type ConsumerLocation = { open: boolean; main: MainNavId | null; sub: string | null; detail: string | null };

export function parseConsumerLocation(hash: string): ConsumerLocation {
  const home: ConsumerLocation = { open: false, main: null, sub: null, detail: null };
  let parts: string[];
  try { parts = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent); }
  catch { return home; }
  if (parts[0] !== "menu") return home;
  const main = MAIN_NAV_ITEMS.find(({ id }) => id === parts[1])?.id ?? null;
  const sub = main ? SUBMENUS_BY_MAIN[main].find(({ id }) => id === parts[2] && id !== "logout")?.id ?? null : null;
  return { open: true, main, sub, detail: main === "quests" && sub ? parts[3] || null : null };
}

export function navigateConsumer(main: MainNavId | null, sub: string | null = null, detail: string | null = null, open = true) {
  const hash = open ? "#/menu" + (main ? `/${main}` : "") + (main && sub ? `/${sub}` : "") + (main === "quests" && sub && detail ? `/${encodeURIComponent(detail)}` : "") : "";
  if (window.location.hash === hash) return;
  window.history.pushState(null, "", window.location.pathname + window.location.search + hash);
  window.dispatchEvent(new Event(LOCATION_EVENT));
}

function subscribe(notify: () => void) {
  window.addEventListener("popstate", notify);
  window.addEventListener("hashchange", notify);
  window.addEventListener(LOCATION_EVENT, notify);
  return () => {
    window.removeEventListener("popstate", notify);
    window.removeEventListener("hashchange", notify);
    window.removeEventListener(LOCATION_EVENT, notify);
  };
}

export function useConsumerLocation() {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash, () => "");
  return parseConsumerLocation(hash);
}
