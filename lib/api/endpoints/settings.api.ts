import { USE_MOCK, apiGet, apiPost } from "../client";
import { MOCK_USER_SETTINGS } from "../mock/settings.mock";
import type { GameSettings, UserSettingsResponse } from "@/shared/api/types";

export async function getSettingsApi(): Promise<UserSettingsResponse> {
  if (USE_MOCK) return MOCK_USER_SETTINGS;
  const raw = await apiGet<{
    userId: number;
    volume: number;
    uiLayoutJson: string | null;
    flagsJson: string | null;
    updatedAt: string;
  }>("/api/v1/users/me/settings");
  return {
    ...raw,
    parsed: raw.flagsJson ? (JSON.parse(raw.flagsJson) as GameSettings) : ({} as GameSettings),
  };
}

export async function updateSettingsApi(settings: Partial<GameSettings>): Promise<UserSettingsResponse> {
  if (USE_MOCK) {
    const merged = { ...MOCK_USER_SETTINGS.parsed, ...settings };
    return {
      ...MOCK_USER_SETTINGS,
      volume: settings.volume ?? MOCK_USER_SETTINGS.volume,
      flagsJson: JSON.stringify(merged),
      parsed: merged,
      updatedAt: new Date().toISOString(),
    };
  }
  const raw = await apiPost<{
    userId: number;
    volume: number;
    uiLayoutJson: string | null;
    flagsJson: string | null;
    updatedAt: string;
  }>("/api/v1/users/me/settings", {
    volume: settings.volume,
    flagsJson: JSON.stringify(settings),
  });
  return {
    ...raw,
    parsed: raw.flagsJson ? (JSON.parse(raw.flagsJson) as GameSettings) : ({} as GameSettings),
  };
}
