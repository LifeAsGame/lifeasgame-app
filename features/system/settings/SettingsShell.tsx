"use client";

import { useState } from "react";

import { useToast } from "@/context/ToastContext";
import type { GraphicsQuality, InputPreset, SettingsView, ThemePreference, UiScale, VoiceChatMode } from "@/shared/api/types";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { SYSTEM_OPTIONS_FORM_FIELDS } from "../model";
import { useSettings } from "./useSettings";

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  title: string;
  description: string;
  previewTheme?: "astral" | "warm-beige";
}> = [
  { value: "ASTRAL", title: "아스트랄", description: "어두운 화면 · 집중", previewTheme: "astral" },
  { value: "WARM_BEIGE", title: "웜 베이지", description: "밝은 화면 · 차분한 기록", previewTheme: "warm-beige" },
  { value: "SYSTEM", title: "기기 설정 따르기", description: "기기의 밝기 설정에 맞춰 자동 변경" },
];

const SETTINGS_GROUPS: Array<{ title: string; description: string; keys: string[] }> = [
  { title: "화면", description: "화면 크기와 표시 방식", keys: ["uiScale"] },
  { title: "소리", description: "전체 음량과 음성 채팅", keys: ["volume", "voiceChat"] },
  { title: "그래픽과 플레이", description: "화질과 효과 표시", keys: ["graphicsQuality", "showDamageNumbers", "showParticles"] },
  { title: "조작", description: "조작 방식", keys: ["inputPreset"] },
  { title: "공개 범위", description: "온라인 상태 표시", keys: ["showOnlineStatus"] },
  { title: "알림", description: "게임 및 이메일 알림", keys: ["notifications", "emailAlerts"] },
  { title: "언어", description: "앱 표시 언어", keys: ["language"] },
];

const UI_SCALES = [75, 100, 125, 150] as const;
const isUiScale = (value: number): value is UiScale => UI_SCALES.some((scale) => scale === value);
const isGraphicsQuality = (value: string): value is GraphicsQuality => ["LOW", "MEDIUM", "HIGH", "ULTRA"].includes(value);
const isVoiceChat = (value: string): value is VoiceChatMode => ["OFF", "TEAM_ONLY", "ALL"].includes(value);
const isInputPreset = (value: string): value is InputPreset => ["STANDARD", "ADVANCED", "CUSTOM"].includes(value);
const isThemePreference = (value: string): value is ThemePreference => ["SYSTEM", "ASTRAL", "WARM_BEIGE"].includes(value);

function displayValue(settings: SettingsView, key: keyof SettingsView) {
  const value = settings[key];
  if (typeof value === "boolean") return value ? "켬" : "끔";
  if (key === "volume" || key === "uiScale") return `${value}%`;
  if (key === "themePreference") return THEME_OPTIONS.find((option) => option.value === value)?.title ?? String(value);
  const field = SYSTEM_OPTIONS_FORM_FIELDS.find((candidate) => candidate.key === key);
  return field?.options?.find((option) => option.value === String(value))?.label ?? String(value);
}

export default function SettingsShell() {
  const settings = useSettings();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const draft = settings.draft;
  const canonicalView = settings.canonical?.view;

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
      showToast({ variant: "success", title: "설정 저장됨", body: "환경 설정이 저장되었습니다." });
    }
  };

  return (
    <div className="lag-settings-shell">
      <PanelStage stageKey="system-options">
        <PanelFrame title="환경 설정" depth={1} contentKey={editing ? "edit" : "summary"}>
          <div className="lag-settings-surface" data-testid="settings-shell">
            {settings.loading && !settings.canonical ? <p role="status" className="lag-settings-state">설정을 불러오는 중…</p> : null}
            {settings.error ? (
              <div className="lag-settings-state lag-settings-state-error">
                <p role="alert" className="lag-state-error text-xs">{settings.error}</p>
                <button type="button" className="lag-button-secondary lag-settings-button" onClick={() => void settings.retry()}>다시 조회</button>
              </div>
            ) : null}

            {!settings.error && settings.canonical ? (
              <fieldset className="lag-settings-theme">
                <legend>테마</legend>
                <p className="lag-settings-group-description">선택 즉시 적용되며 다른 설정과 별도로 저장됩니다.</p>
                <div className="lag-theme-preview" aria-live="polite">
                  <div>
                    <strong>현재 테마</strong>
                    <span>{THEME_OPTIONS.find((option) => option.value === settings.themePreference)?.title}</span>
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
                      <strong>{option.title}</strong>
                      <span className="lag-text-meta">{option.description}</span>
                      {settings.themePreference === option.value ? <span className="lag-theme-current">선택됨</span> : null}
                      {option.previewTheme ? (
                        <span className="lag-theme-swatches" aria-hidden>
                          {Array.from({ length: 5 }, (_, index) => <span key={index} className="lag-theme-swatch" />)}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
                {settings.themeSaving ? <p role="status" className="lag-settings-pending">테마 저장 중…</p> : null}
                {settings.themeSaveError ? <p role="alert" className="lag-state-error text-xs">{settings.themeSaveError}</p> : null}
              </fieldset>
            ) : null}

            {!settings.error && canonicalView && !editing ? (
              <section className="lag-settings-preferences" aria-labelledby="settings-preferences-title">
                <div className="lag-settings-section-header">
                  <div>
                    <h2 id="settings-preferences-title">기본 설정</h2>
                    <p>화면, 소리, 조작, 공개 범위, 알림과 언어를 확인하세요.</p>
                  </div>
                  <button type="button" className="lag-button-primary lag-settings-button" onClick={() => setEditing(true)}>설정 수정</button>
                </div>
                <div className="lag-settings-group-grid">
                  {SETTINGS_GROUPS.map((group) => (
                    <section key={group.title} className="lag-settings-group">
                      <h3>{group.title}</h3>
                      <p className="lag-settings-group-description">{group.description}</p>
                      <dl className="lag-settings-values">
                        {group.title === "화면" ? (
                          <div><dt>테마</dt><dd>{displayValue(canonicalView, "themePreference")}</dd></div>
                        ) : null}
                        {SYSTEM_OPTIONS_FORM_FIELDS.filter((field) => group.keys.includes(field.key)).map((field) => (
                          <div key={field.key}>
                            <dt>{field.label}</dt>
                            <dd>{displayValue(canonicalView, field.key as keyof SettingsView)}</dd>
                          </div>
                        ))}
                      </dl>
                    </section>
                  ))}
                </div>
              </section>
            ) : null}

            {!settings.error && editing && draft ? (
              <form className="lag-settings-form" onSubmit={submit}>
                <div className="lag-settings-section-header">
                  <div>
                    <h2>기본 설정 수정</h2>
                    <p>테마는 위에서 별도로 저장됩니다.</p>
                  </div>
                </div>
                <div className="lag-settings-group-grid">
                  {SETTINGS_GROUPS.map((group) => (
                    <fieldset key={group.title} className="lag-settings-group">
                      <legend>{group.title}</legend>
                      <p className="lag-settings-group-description">{group.description}</p>
                      <div className="lag-settings-fields">
                        {SYSTEM_OPTIONS_FORM_FIELDS.filter((field) => group.keys.includes(field.key)).map((field) => (
                          <label key={field.key} className="lag-settings-label">
                            {field.label}
                            {field.type === "select" ? (
                              <select className="lag-settings-control" value={String(draft[field.key as keyof SettingsView])} onChange={(event) => change(field.key, event.target.value)}>
                                {field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            ) : (
                              <input
                                type="number"
                                min={0}
                                max={100}
                                step={1}
                                value={draft.volume}
                                onChange={(event) => change(field.key, event.target.value)}
                                className="lag-settings-control"
                              />
                            )}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                {settings.saveError ? <p role="alert" className="lag-state-error text-xs">{settings.saveError}</p> : null}
                <div className="lag-settings-actions">
                  <button type="submit" className="lag-button-primary lag-settings-button" disabled={!settings.dirty || settings.saving || settings.themeSaving}>{settings.saving ? "저장 중…" : "설정 저장"}</button>
                  <button type="button" className="lag-button-secondary lag-settings-button" disabled={settings.saving || settings.themeSaving} onClick={() => { settings.cancel(); setEditing(false); }}>취소</button>
                </div>
              </form>
            ) : null}
          </div>
        </PanelFrame>
      </PanelStage>
    </div>
  );
}
