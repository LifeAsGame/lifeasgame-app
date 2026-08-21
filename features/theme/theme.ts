import type { ThemePreference } from "@/shared/api/types";

export type { ThemePreference } from "@/shared/api/types";
export type EffectiveTheme = "astral" | "warm-beige";

export const THEME_STORAGE_KEY = "lifeasgame.themePreference";
export const DEFAULT_THEME_PREFERENCE: ThemePreference = "WARM_BEIGE";

export function parseThemePreference(value: unknown): ThemePreference | null {
  return value === "SYSTEM" || value === "ASTRAL" || value === "WARM_BEIGE" ? value : null;
}

export function resolveTheme(preference: unknown, systemDark = false): EffectiveTheme {
  const supported = parseThemePreference(preference) ?? DEFAULT_THEME_PREFERENCE;
  if (supported === "SYSTEM") return systemDark ? "astral" : "warm-beige";
  return supported === "ASTRAL" ? "astral" : "warm-beige";
}

export function readStoredThemePreference(storage?: Pick<Storage, "getItem">): ThemePreference {
  try {
    return parseThemePreference(storage?.getItem(THEME_STORAGE_KEY)) ?? DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export const THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const p=localStorage.getItem("${THEME_STORAGE_KEY}");const dark=p==="SYSTEM"&&typeof matchMedia==="function"&&matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.dataset.theme=p==="ASTRAL"||dark?"astral":"warm-beige"}catch{document.documentElement.dataset.theme="warm-beige"}})()`;
