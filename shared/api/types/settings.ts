export type GraphicsQuality = "LOW" | "MEDIUM" | "HIGH" | "ULTRA";
export type VoiceChatMode = "OFF" | "TEAM_ONLY" | "ALL";
export type UiScale = 75 | 100 | 125 | 150;
export type InputPreset = "STANDARD" | "ADVANCED" | "CUSTOM";
export type ThemePreference = "SYSTEM" | "ASTRAL" | "WARM_BEIGE";

export interface SettingsFlags {
  graphicsQuality: GraphicsQuality;
  voiceChat: VoiceChatMode;
  uiScale: UiScale;
  inputPreset: InputPreset;
  showDamageNumbers: boolean;
  showParticles: boolean;
  showOnlineStatus: boolean;
  notifications: boolean;
  emailAlerts: boolean;
  language: string;
  themePreference: ThemePreference;
}

export interface SettingsView extends SettingsFlags {
  volume: number;
}

export interface UserSettingsResponse {
  userId: number;
  volume: number;
  uiLayoutJson: string | null;
  flagsJson: string | null;
  updatedAt: string;
}

export interface UpdateUserSettingsRequest {
  volume?: number | null;
  uiLayoutJson?: string | null;
  flagsJson?: string | null;
}

export interface ParsedUserSettings {
  transport: UserSettingsResponse;
  rawFlags: Record<string, unknown>;
  view: SettingsView;
}
