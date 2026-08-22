"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ParsedUserSettings, SettingsView, ThemePreference } from "@/shared/api/types";
import { useTheme } from "@/features/theme/ThemeProvider";
import { DEFAULT_THEME_PREFERENCE, parseThemePreference } from "@/features/theme/theme";
import { getSettingsApi, updateSettingsApi } from "@/lib/api/endpoints/settings.api";
import { buildSettingsPatch, buildThemeSettingsPatch, parseUserSettings } from "./model";

const message = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

function withTheme(parsed: ParsedUserSettings, localPreferenceWhenServerKeyMissing: ThemePreference) {
  const supplied = Object.prototype.hasOwnProperty.call(parsed.rawFlags, "themePreference");
  const preference = supplied
    ? parseThemePreference(parsed.rawFlags.themePreference) ?? DEFAULT_THEME_PREFERENCE
    : localPreferenceWhenServerKeyMissing;
  return { ...parsed, view: { ...parsed.view, themePreference: preference } };
}

export function useSettings() {
  const { preference: runtimePreference, setPreference: setRuntimePreference } = useTheme();
  const [canonical, setCanonical] = useState<ParsedUserSettings | null>(null);
  const [draft, setDraft] = useState<SettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [themeSaving, setThemeSaving] = useState(false);
  const [themeSaveError, setThemeSaveError] = useState<string | null>(null);
  const saveLocked = useRef(false);
  const themeSaveLocked = useRef(false);
  const themePreferenceRef = useRef(runtimePreference);

  useEffect(() => {
    themePreferenceRef.current = runtimePreference;
  }, [runtimePreference]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = withTheme(parseUserSettings(await getSettingsApi()), themePreferenceRef.current);
      setCanonical(parsed);
      setDraft(parsed.view);
      setSaveError(null);
    } catch (caught) {
      setError(message(caught, "Unable to load Settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateDraft = (changes: Partial<SettingsView>) => {
    setDraft((current) => current ? { ...current, ...changes } : current);
    setSaveError(null);
  };

  const cancel = () => {
    setDraft(canonical?.view ?? null);
    setSaveError(null);
  };

  const save = async () => {
    if (!canonical || !draft || saveLocked.current || themeSaveLocked.current) return false;
    if (!Number.isInteger(draft.volume) || draft.volume < 0 || draft.volume > 100) {
      setSaveError("Master Volume must be a whole number from 0 to 100.");
      return false;
    }
    saveLocked.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const parsed = withTheme(parseUserSettings(await updateSettingsApi(buildSettingsPatch(canonical, draft))), themePreferenceRef.current);
      setCanonical(parsed);
      setDraft({ ...parsed.view, themePreference: themePreferenceRef.current });
      return true;
    } catch (caught) {
      setSaveError(message(caught, "Unable to save Settings."));
      return false;
    } finally {
      saveLocked.current = false;
      setSaving(false);
    }
  };

  const setThemePreference = async (preference: ThemePreference) => {
    if (themeSaveLocked.current || saveLocked.current) return false;
    setRuntimePreference(preference);
    setDraft((current) => current ? { ...current, themePreference: preference } : current);
    setThemeSaveError(null);
    if (!canonical) return false;
    themeSaveLocked.current = true;
    setThemeSaving(true);
    try {
      const parsed = withTheme(parseUserSettings(await updateSettingsApi(buildThemeSettingsPatch(canonical, preference))), preference);
      setRuntimePreference(parsed.view.themePreference);
      setCanonical(parsed);
      setDraft((current) => current ? { ...current, themePreference: parsed.view.themePreference } : parsed.view);
      return true;
    } catch (caught) {
      setThemeSaveError(message(caught, "Unable to save theme preference."));
      return false;
    } finally {
      themeSaveLocked.current = false;
      setThemeSaving(false);
    }
  };

  const dirty = Boolean(canonical && draft
    && JSON.stringify({ ...canonical.view, themePreference: undefined }) !== JSON.stringify({ ...draft, themePreference: undefined }));
  return {
    loading,
    error,
    retry: load,
    canonical,
    draft,
    dirty,
    saving,
    saveError,
    updateDraft,
    save,
    cancel,
    themePreference: draft?.themePreference ?? runtimePreference,
    themeSaving,
    themeSaveError,
    setThemePreference,
  };
}
