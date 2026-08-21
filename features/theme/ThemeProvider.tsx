"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from "react";

import type { EffectiveTheme, ThemePreference } from "./theme";
import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY, readStoredThemePreference, resolveTheme } from "./theme";

type ThemeContextValue = {
  preference: ThemePreference;
  effectiveTheme: EffectiveTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function systemDark() {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyRoot(preference: ThemePreference): EffectiveTheme {
  const effective = resolveTheme(preference, systemDark());
  document.documentElement.dataset.theme = effective;
  return effective;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(DEFAULT_THEME_PREFERENCE);
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>("warm-beige");

  const setPreference = useCallback((next: ThemePreference) => {
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* local cache is best-effort */ }
    setPreferenceState(next);
    setEffectiveTheme(applyRoot(next));
  }, []);

  useLayoutEffect(() => {
    const stored = readStoredThemePreference(localStorage);
    setPreferenceState(stored);
    setEffectiveTheme(applyRoot(stored));
  }, []);

  useEffect(() => {
    if (preference !== "SYSTEM" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setEffectiveTheme(applyRoot("SYSTEM"));
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);

  const value = useMemo(() => ({ preference, effectiveTheme, setPreference }), [preference, effectiveTheme, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
