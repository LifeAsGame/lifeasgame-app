import type { SystemSubId, FormFieldSpec } from "@/entities/nav";

export const SYSTEM_PANEL_ROWS: Record<Exclude<SystemSubId, "logout">, {
  description: string;
  rows: string[];
}> = {
  options: {
    description: "Graphics, audio, controls, and gameplay preferences.",
    rows: [
      "Master Volume: 78%",
      "Graphics Quality: High",
      "Voice Chat: Team Only",
      "UI Scale: 100%",
      "Input Preset: Standard",
    ],
  },
  help: {
    description: "Quick guides, FAQ, and support routes.",
    rows: [
      "Quick Start Guide",
      "Frequently Asked Questions",
      "Contact Support",
      "Patch Notes",
      "Terms and Safety",
    ],
  },
};

export const SYSTEM_OPTIONS_FORM_FIELDS: FormFieldSpec[] = [
  {
    key: "volume",
    label: "Master Volume",
    type: "number",
    placeholder: "0 ~ 100",
  },
  {
    key: "graphicsQuality",
    label: "Graphics Quality",
    type: "select",
    options: [
      { value: "LOW",    label: "Low" },
      { value: "MEDIUM", label: "Medium" },
      { value: "HIGH",   label: "High" },
      { value: "ULTRA",  label: "Ultra" },
    ],
  },
  {
    key: "voiceChat",
    label: "Voice Chat",
    type: "select",
    options: [
      { value: "OFF",       label: "Off" },
      { value: "TEAM_ONLY", label: "Team Only" },
      { value: "ALL",       label: "All" },
    ],
  },
  {
    key: "uiScale",
    label: "UI Scale (%)",
    type: "number",
    placeholder: "75 ~ 150",
  },
  {
    key: "inputPreset",
    label: "Input Preset",
    type: "select",
    options: [
      { value: "STANDARD", label: "Standard" },
      { value: "ADVANCED", label: "Advanced" },
      { value: "CUSTOM",   label: "Custom" },
    ],
  },
  {
    key: "showDamageNumbers",
    label: "Damage Numbers",
    type: "select",
    options: [
      { value: "true",  label: "On" },
      { value: "false", label: "Off" },
    ],
  },
  {
    key: "showParticles",
    label: "Particle Effects",
    type: "select",
    options: [
      { value: "true",  label: "On" },
      { value: "false", label: "Off" },
    ],
  },
  {
    key: "showOnlineStatus",
    label: "Show Online Status",
    type: "select",
    options: [
      { value: "true",  label: "On" },
      { value: "false", label: "Off" },
    ],
  },
  {
    key: "notifications",
    label: "In-Game Notifications",
    type: "select",
    options: [
      { value: "true",  label: "On" },
      { value: "false", label: "Off" },
    ],
  },
  {
    key: "emailAlerts",
    label: "Email Alerts",
    type: "select",
    options: [
      { value: "true",  label: "On" },
      { value: "false", label: "Off" },
    ],
  },
  {
    key: "language",
    label: "Language",
    type: "select",
    options: [
      { value: "ko", label: "한국어" },
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
    ],
  },
];
