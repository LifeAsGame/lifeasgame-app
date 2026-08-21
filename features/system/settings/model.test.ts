import { describe, expect, it } from "vitest";

import type { UserSettingsResponse } from "@/shared/api/types";
import { SYSTEM_OPTIONS_FORM_FIELDS } from "../model";
import { buildSettingsPatch, buildThemeSettingsPatch, parseUserSettings, SettingsParseError } from "./model";

const transport = (flagsJson: string | null): UserSettingsResponse => ({
  userId: 7,
  volume: 72,
  uiLayoutJson: JSON.stringify({ untouched: true }),
  flagsJson,
  updatedAt: "2026-08-18T00:00:00Z",
});

describe("Settings flags parser and merger", () => {
  it("defaults only missing known flags and preserves unknown keys without duplicating volume", () => {
    const canonical = parseUserSettings(transport(JSON.stringify({
      inputPreset: "ADVANCED",
      uiScale: 125,
      futureFlag: { enabled: true },
      volume: 12,
    })));
    const request = buildSettingsPatch(canonical, { ...canonical.view, volume: 44, graphicsQuality: "LOW" });
    const flags = JSON.parse(request.flagsJson!);

    expect(canonical.view).toEqual(expect.objectContaining({ volume: 72, inputPreset: "ADVANCED", uiScale: 125, voiceChat: "TEAM_ONLY" }));
    expect(request).not.toHaveProperty("uiLayoutJson");
    expect(request.volume).toBe(44);
    expect(flags).toEqual(expect.objectContaining({ futureFlag: { enabled: true }, graphicsQuality: "LOW", inputPreset: "ADVANCED" }));
    expect(flags).not.toHaveProperty("volume");
  });

  it("accepts null as empty flags but rejects malformed and non-object flags", () => {
    expect(parseUserSettings(transport(null)).view.uiScale).toBe(100);
    expect(() => parseUserSettings(transport("{"))).toThrow(SettingsParseError);
    expect(() => parseUserSettings(transport("[]"))).toThrow(SettingsParseError);
    expect(() => parseUserSettings(transport("null"))).toThrow(SettingsParseError);
  });

  it("offers only canonical UI scales and includes Advanced input", () => {
    expect(SYSTEM_OPTIONS_FORM_FIELDS.find(({ key }) => key === "uiScale")?.options?.map(({ value }) => value)).toEqual(["75", "100", "125", "150"]);
    expect(SYSTEM_OPTIONS_FORM_FIELDS.find(({ key }) => key === "inputPreset")?.options?.map(({ value }) => value)).toContain("ADVANCED");
  });

  it("falls back unknown theme safely and changes it only through the focused theme patch", () => {
    const canonical = parseUserSettings(transport(JSON.stringify({ themePreference: "FUTURE_THEME", futureFlag: "keep" })));
    expect(canonical.view.themePreference).toBe("WARM_BEIGE");

    const ordinaryFlags = JSON.parse(buildSettingsPatch(canonical, { ...canonical.view, volume: 55 }).flagsJson!);
    expect(ordinaryFlags).toMatchObject({ themePreference: "FUTURE_THEME", futureFlag: "keep" });

    const themeFlags = JSON.parse(buildThemeSettingsPatch(canonical, "ASTRAL").flagsJson!);
    expect(themeFlags).toMatchObject({ themePreference: "ASTRAL", futureFlag: "keep" });
  });
});
