import type { FormFieldSpec } from "@/entities/nav";

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
    type: "select",
    options: [75, 100, 125, 150].map((value) => ({ value: String(value), label: `${value}%` })),
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
