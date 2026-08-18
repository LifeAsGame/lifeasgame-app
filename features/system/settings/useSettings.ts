"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ParsedUserSettings, SettingsView } from "@/shared/api/types";
import { getSettingsApi, updateSettingsApi } from "@/lib/api/endpoints/settings.api";
import { buildSettingsPatch, parseUserSettings } from "./model";

const message = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

export function useSettings() {
  const [canonical, setCanonical] = useState<ParsedUserSettings | null>(null);
  const [draft, setDraft] = useState<SettingsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveLocked = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const parsed = parseUserSettings(await getSettingsApi());
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
    if (!canonical || !draft || saveLocked.current) return false;
    if (!Number.isInteger(draft.volume) || draft.volume < 0 || draft.volume > 100) {
      setSaveError("Master Volume must be a whole number from 0 to 100.");
      return false;
    }
    saveLocked.current = true;
    setSaving(true);
    setSaveError(null);
    try {
      const parsed = parseUserSettings(await updateSettingsApi(buildSettingsPatch(canonical, draft)));
      setCanonical(parsed);
      setDraft(parsed.view);
      return true;
    } catch (caught) {
      setSaveError(message(caught, "Unable to save Settings."));
      return false;
    } finally {
      saveLocked.current = false;
      setSaving(false);
    }
  };

  const dirty = Boolean(canonical && draft && JSON.stringify(canonical.view) !== JSON.stringify(draft));
  return { loading, error, retry: load, canonical, draft, dirty, saving, saveError, updateDraft, save, cancel };
}
