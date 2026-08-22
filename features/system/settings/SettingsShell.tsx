"use client";

import { useState } from "react";

import { useToast } from "@/context/ToastContext";
import type { GraphicsQuality, InputPreset, SettingsView, ThemePreference, UiScale, VoiceChatMode } from "@/shared/api/types";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { actionBtnStyle } from "@/widgets/right-panels/ui/styles";
import { SYSTEM_OPTIONS_FORM_FIELDS } from "../model";
import { useSettings } from "./useSettings";

const secondaryButton = {
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  previewTheme?: "astral" | "warm-beige";
}> = [
  { value: "ASTRAL", title: "Astral Neutral", description: "Dark · spatial · focused", previewTheme: "astral" },
  { value: "WARM_BEIGE", title: "Warm Beige / Analog Spatial", description: "Analog · calm · archive", previewTheme: "warm-beige" },
  { value: "SYSTEM", title: "System follow", description: "Dark OS → Astral · Light OS → Warm Beige" },
];

const UI_SCALES = [75, 100, 125, 150] as const;
const isUiScale = (value: number): value is UiScale => UI_SCALES.some((scale) => scale === value);
const isGraphicsQuality = (value: string): value is GraphicsQuality => ["LOW", "MEDIUM", "HIGH", "ULTRA"].includes(value);
const isVoiceChat = (value: string): value is VoiceChatMode => ["OFF", "TEAM_ONLY", "ALL"].includes(value);
const isInputPreset = (value: string): value is InputPreset => ["STANDARD", "ADVANCED", "CUSTOM"].includes(value);
const isThemePreference = (value: string): value is ThemePreference => ["SYSTEM", "ASTRAL", "WARM_BEIGE"].includes(value);

function summaryRows(settings: SettingsView) {
  return [
    `Master Volume: ${settings.volume}%`,
    `Graphics Quality: ${settings.graphicsQuality}`,
    `Voice Chat: ${settings.voiceChat}`,
    `UI Scale: ${settings.uiScale}%`,
    `Input Preset: ${settings.inputPreset}`,
    `Damage Numbers: ${settings.showDamageNumbers ? "On" : "Off"}`,
    `Particle Effects: ${settings.showParticles ? "On" : "Off"}`,
    `Show Online Status: ${settings.showOnlineStatus ? "On" : "Off"}`,
    `Notifications: ${settings.notifications ? "On" : "Off"}`,
    `Email Alerts: ${settings.emailAlerts ? "On" : "Off"}`,
    `Language: ${settings.language}`,
  ];
}

export default function SettingsShell() {
  const settings = useSettings();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const draft = settings.draft;

  const change = (key: string, value: string) => {
    if (key === "volume") return settings.updateDraft({ volume: Number(value) });
    if (key === "uiScale") {
      const scale = Number(value);
      if (isUiScale(scale)) settings.updateDraft({ uiScale: scale });
      return;
    }
    if (key === "graphicsQuality" && isGraphicsQuality(value)) return settings.updateDraft({ graphicsQuality: value });
    if (key === "voiceChat" && isVoiceChat(value)) return settings.updateDraft({ voiceChat: value });
    if (key === "inputPreset" && isInputPreset(value)) return settings.updateDraft({ inputPreset: value });
    if (key === "showDamageNumbers") return settings.updateDraft({ showDamageNumbers: value === "true" });
    if (key === "showParticles") return settings.updateDraft({ showParticles: value === "true" });
    if (key === "showOnlineStatus") return settings.updateDraft({ showOnlineStatus: value === "true" });
    if (key === "notifications") return settings.updateDraft({ notifications: value === "true" });
    if (key === "emailAlerts") return settings.updateDraft({ emailAlerts: value === "true" });
    if (key === "language") settings.updateDraft({ language: value });
  };

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await settings.save()) {
      setEditing(false);
      showToast({ variant: "success", title: "설정 저장됨", body: "System options updated." });
    }
  };

  return (
    <div className="lag-settings-shell">
      <PanelStage stageKey="system-options" focusKey={editing ? "edit" : "summary"}>
        <PanelFrame title="Settings" depth={1} contentKey={editing ? "edit" : "summary"}>
        <div className="space-y-3 px-3" data-testid="settings-shell">
        {settings.loading && !settings.canonical ? <InfoCard>Loading Settings...</InfoCard> : null}
        {settings.error ? (
          <div className="space-y-2">
            <p role="alert" className="lag-state-error text-xs">{settings.error}</p>
            <button type="button" className="lag-button-secondary" style={secondaryButton} onClick={() => void settings.retry()}>Retry</button>
          </div>
        ) : null}

        {!settings.error && settings.canonical ? (
          <fieldset aria-label="Appearance" className="space-y-3">
            <legend className="lag-settings-label">Theme</legend>
            <div className="lag-theme-preview" aria-live="polite">
              <div className="text-center">
                <strong className="block text-sm">Immediate preview</strong>
                <span className="lag-text-meta mt-1 block text-xs">{settings.themePreference.replace("_", " ")}</span>
              </div>
            </div>
            <div className="lag-theme-picker">
              {THEME_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={`lag-theme-option${option.value === "SYSTEM" ? " lag-theme-option-system" : ""}`}
                  data-lag-preview-theme={option.previewTheme}
                >
                  <input
                    type="radio"
                    name="themePreference"
                    value={option.value}
                    checked={settings.themePreference === option.value}
                    disabled={settings.themeSaving || settings.saving}
                    onChange={(event) => { if (isThemePreference(event.target.value)) void settings.setThemePreference(event.target.value); }}
                  />
                  <strong className="text-sm">{option.title}</strong>
                  <span className="lag-text-meta text-xs">{option.description}</span>
                  {option.previewTheme ? (
                    <span className="lag-theme-swatches" aria-hidden>
                      {Array.from({ length: 5 }, (_, index) => <span key={index} className="lag-theme-swatch" />)}
                    </span>
                  ) : null}
                </label>
              ))}
            </div>
            {settings.themeSaveError ? <p role="alert" className="lag-state-error mt-1 text-xs">{settings.themeSaveError}</p> : null}
          </fieldset>
        ) : null}

        {!settings.error && settings.canonical && !editing ? (
          <>
            <InfoCard>Graphics, audio, controls, and gameplay preferences.</InfoCard>
            <div className="space-y-1.5">
              {summaryRows(settings.canonical.view).map((row) => <GoldRow key={row}>{row}</GoldRow>)}
            </div>
            <button type="button" className="lag-button-primary" style={actionBtnStyle} onClick={() => setEditing(true)}>설정 편집</button>
          </>
        ) : null}

        {!settings.error && editing && draft ? (
          <form className="space-y-3" onSubmit={submit}>
            {SYSTEM_OPTIONS_FORM_FIELDS.map((field) => (
              <label key={field.key} className="lag-settings-label block">
                {field.label}
                {field.type === "select" ? (
                  <select className="lag-settings-control mt-1" title={field.label} value={String(draft[field.key as keyof SettingsView])} onChange={(event) => change(field.key, event.target.value)}>
                    {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : (
                  <input
                    aria-label={field.label}
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={draft.volume}
                    onChange={(event) => change(field.key, event.target.value)}
                    className="lag-settings-control mt-1"
                  />
                )}
              </label>
            ))}
            {settings.saveError ? <p role="alert" className="lag-state-error text-xs">{settings.saveError}</p> : null}
            <div className="flex gap-2">
              <button type="submit" className="lag-button-primary" disabled={!settings.dirty || settings.saving || settings.themeSaving} style={{ ...actionBtnStyle, flex: 1 }}>{settings.saving ? "Saving..." : "Save Settings"}</button>
              <button type="button" className="lag-button-secondary" disabled={settings.saving || settings.themeSaving} style={secondaryButton} onClick={() => { settings.cancel(); setEditing(false); }}>Cancel</button>
            </div>
          </form>
        ) : null}
        </div>
        </PanelFrame>
      </PanelStage>
    </div>
  );
}
