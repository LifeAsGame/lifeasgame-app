import type { GameSettings, UserSettingsResponse } from "@/shared/api/types";

export const DEFAULT_SETTINGS: GameSettings = {
  volume: 78,
  graphicsQuality: "HIGH",
  voiceChat: "TEAM_ONLY",
  uiScale: 100,
  inputPreset: "STANDARD",
  showDamageNumbers: true,
  showParticles: true,
  showOnlineStatus: true,
  notifications: true,
  emailAlerts: false,
  language: "ko",
};

export const MOCK_USER_SETTINGS: UserSettingsResponse = {
  userId: 6,
  volume: 78,
  uiLayoutJson: null,
  flagsJson: JSON.stringify(DEFAULT_SETTINGS),
  updatedAt: "2026-05-01T12:00:00Z",
  parsed: DEFAULT_SETTINGS,
};
