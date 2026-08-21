import type { UpdateUserSettingsRequest, UserSettingsResponse } from "@/shared/api/types";

const initialSettings: UserSettingsResponse = {
  userId: 6,
  volume: 78,
  uiLayoutJson: JSON.stringify({ panel: "classic" }),
  flagsJson: JSON.stringify({
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
    themePreference: "WARM_BEIGE",
    futureFlag: "preserved",
  }),
  updatedAt: "2026-05-01T12:00:00Z",
};

let settings = { ...initialSettings };

export const settingsMock = {
  reset() { settings = { ...initialSettings }; },
  get(): UserSettingsResponse { return { ...settings }; },
  patch(request: UpdateUserSettingsRequest): UserSettingsResponse {
    settings = {
      ...settings,
      ...(request.volume == null ? {} : { volume: request.volume }),
      ...(request.uiLayoutJson == null ? {} : { uiLayoutJson: request.uiLayoutJson }),
      ...(request.flagsJson == null ? {} : { flagsJson: request.flagsJson }),
      updatedAt: new Date().toISOString(),
    };
    return { ...settings };
  },
};
