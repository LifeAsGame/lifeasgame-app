import type {
  GraphicsQuality,
  InputPreset,
  ParsedUserSettings,
  SettingsFlags,
  SettingsView,
  UiScale,
  UpdateUserSettingsRequest,
  UserSettingsResponse,
  VoiceChatMode,
} from "@/shared/api/types";

export const DEFAULT_SETTINGS_FLAGS: SettingsFlags = {
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

const GRAPHICS_QUALITIES: GraphicsQuality[] = ["LOW", "MEDIUM", "HIGH", "ULTRA"];
const VOICE_CHAT_MODES: VoiceChatMode[] = ["OFF", "TEAM_ONLY", "ALL"];
const UI_SCALES: UiScale[] = [75, 100, 125, 150];
const INPUT_PRESETS: InputPreset[] = ["STANDARD", "ADVANCED", "CUSTOM"];

export class SettingsParseError extends Error {
  constructor(message = "Settings flags are invalid and cannot be edited safely.") {
    super(message);
    this.name = "SettingsParseError";
  }
}

function enumValue<T extends string | number>(raw: unknown, fallback: T, allowed: T[]): T {
  if (raw === undefined) return fallback;
  if (allowed.includes(raw as T)) return raw as T;
  throw new SettingsParseError();
}

function booleanValue(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  if (typeof raw === "boolean") return raw;
  throw new SettingsParseError();
}

function stringValue(raw: unknown, fallback: string): string {
  if (raw === undefined) return fallback;
  if (typeof raw === "string") return raw;
  throw new SettingsParseError();
}

export function parseUserSettings(transport: UserSettingsResponse): ParsedUserSettings {
  let parsed: unknown = {};
  try {
    parsed = transport.flagsJson === null ? {} : JSON.parse(transport.flagsJson);
  } catch {
    throw new SettingsParseError();
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) throw new SettingsParseError();
  if (!Number.isInteger(transport.volume) || transport.volume < 0 || transport.volume > 100) throw new SettingsParseError("Settings volume is invalid.");

  const rawFlags = parsed as Record<string, unknown>;
  const view: SettingsView = {
    volume: transport.volume,
    graphicsQuality: enumValue(rawFlags.graphicsQuality, DEFAULT_SETTINGS_FLAGS.graphicsQuality, GRAPHICS_QUALITIES),
    voiceChat: enumValue(rawFlags.voiceChat, DEFAULT_SETTINGS_FLAGS.voiceChat, VOICE_CHAT_MODES),
    uiScale: enumValue(rawFlags.uiScale, DEFAULT_SETTINGS_FLAGS.uiScale, UI_SCALES),
    inputPreset: enumValue(rawFlags.inputPreset, DEFAULT_SETTINGS_FLAGS.inputPreset, INPUT_PRESETS),
    showDamageNumbers: booleanValue(rawFlags.showDamageNumbers, DEFAULT_SETTINGS_FLAGS.showDamageNumbers),
    showParticles: booleanValue(rawFlags.showParticles, DEFAULT_SETTINGS_FLAGS.showParticles),
    showOnlineStatus: booleanValue(rawFlags.showOnlineStatus, DEFAULT_SETTINGS_FLAGS.showOnlineStatus),
    notifications: booleanValue(rawFlags.notifications, DEFAULT_SETTINGS_FLAGS.notifications),
    emailAlerts: booleanValue(rawFlags.emailAlerts, DEFAULT_SETTINGS_FLAGS.emailAlerts),
    language: stringValue(rawFlags.language, DEFAULT_SETTINGS_FLAGS.language),
  };
  return { transport, rawFlags, view };
}

export function buildSettingsPatch(canonical: ParsedUserSettings, draft: SettingsView): UpdateUserSettingsRequest {
  const flagsJson = { ...canonical.rawFlags, ...draft } as Record<string, unknown>;
  delete flagsJson.volume;
  return { volume: draft.volume, flagsJson: JSON.stringify(flagsJson) };
}
