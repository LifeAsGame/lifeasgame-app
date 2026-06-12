export type GraphicsQuality = "LOW" | "MEDIUM" | "HIGH" | "ULTRA";
export type VoiceChatMode = "OFF" | "TEAM_ONLY" | "ALL";
export type UiScale = 75 | 100 | 125 | 150;
export type InputPreset = "STANDARD" | "CUSTOM";

export interface GameSettings {
  volume: number;
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
}

export interface UserSettingsResponse {
  userId: number;
  volume: number;
  uiLayoutJson: string | null;
  flagsJson: string | null;
  updatedAt: string;
  parsed: GameSettings;
}
