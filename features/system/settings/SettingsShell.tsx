"use client";

import { useState } from "react";

import { useToast } from "@/context/ToastContext";
import type { GraphicsQuality, InputPreset, SettingsView, ThemePreference, UiScale, VoiceChatMode } from "@/shared/api/types";
import { INPUT_STYLE, SAO } from "@/shared/design/tokens";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { actionBtnStyle } from "@/widgets/right-panels/ui/styles";
import { SYSTEM_OPTIONS_FORM_FIELDS } from "../model";
import { useSettings } from "./useSettings";

const secondaryButton = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

const fieldLabel = {
  display: "block",
  fontSize: "0.62rem",
  letterSpacing: "0.14em",
  color: SAO.color.text.label,
  textTransform: "uppercase",
} as const;

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
    <PanelFrame title="System Options" depth={1}>
      <div className="space-y-3 px-3" data-testid="settings-shell">
        {settings.loading && !settings.canonical ? <InfoCard>Loading Settings...</InfoCard> : null}
        {settings.error ? (
          <div className="space-y-2">
            <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{settings.error}</p>
            <button type="button" style={secondaryButton} onClick={() => void settings.retry()}>Retry</button>
          </div>
        ) : null}

        {!settings.error && settings.canonical ? (
          <section aria-label="Appearance">
            <label style={fieldLabel}>
              Theme
              <select
                aria-label="Theme"
                value={settings.themePreference}
                disabled={settings.themeSaving || settings.saving}
                onChange={(event) => { if (isThemePreference(event.target.value)) void settings.setThemePreference(event.target.value); }}
                style={INPUT_STYLE}
              >
                <option value="SYSTEM">System</option>
                <option value="ASTRAL">Astral</option>
                <option value="WARM_BEIGE">Warm Beige</option>
              </select>
            </label>
            {settings.themeSaveError ? <p role="alert" className="mt-1 text-xs" style={{ color: SAO.color.action.red }}>{settings.themeSaveError}</p> : null}
          </section>
        ) : null}

        {!settings.error && settings.canonical && !editing ? (
          <>
            <InfoCard>Graphics, audio, controls, and gameplay preferences.</InfoCard>
            <div className="space-y-1.5">
              {summaryRows(settings.canonical.view).map((row) => <GoldRow key={row}>{row}</GoldRow>)}
            </div>
            <button type="button" style={actionBtnStyle} onClick={() => setEditing(true)}>설정 편집</button>
          </>
        ) : null}

        {!settings.error && editing && draft ? (
          <form className="space-y-3" onSubmit={submit}>
            {SYSTEM_OPTIONS_FORM_FIELDS.map((field) => (
              <label key={field.key} style={fieldLabel}>
                {field.label}
                {field.type === "select" ? (
                  <select title={field.label} value={String(draft[field.key as keyof SettingsView])} onChange={(event) => change(field.key, event.target.value)} style={INPUT_STYLE}>
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
                    style={INPUT_STYLE}
                  />
                )}
              </label>
            ))}
            {settings.saveError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{settings.saveError}</p> : null}
            <div className="flex gap-2">
              <button type="submit" disabled={!settings.dirty || settings.saving || settings.themeSaving} style={{ ...actionBtnStyle, flex: 1 }}>{settings.saving ? "Saving..." : "Save Settings"}</button>
              <button type="button" disabled={settings.saving || settings.themeSaving} style={secondaryButton} onClick={() => { settings.cancel(); setEditing(false); }}>Cancel</button>
            </div>
          </form>
        ) : null}
      </div>
    </PanelFrame>
  );
}
