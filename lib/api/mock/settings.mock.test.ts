import { beforeEach, describe, expect, it } from "vitest";

import { settingsMock } from "./settings.mock";

describe("mutable Settings mock authority", () => {
  beforeEach(() => settingsMock.reset());

  it("persists supplied PATCH fields into later GET and preserves omitted or null fields", () => {
    const before = settingsMock.get();
    const flagsJson = JSON.stringify({ notifications: false, futureFlag: "kept" });
    settingsMock.patch({ volume: 31, flagsJson });
    settingsMock.patch({ volume: null, uiLayoutJson: null });
    const after = settingsMock.get();

    expect(after).toEqual(expect.objectContaining({ userId: before.userId, volume: 31, flagsJson, uiLayoutJson: before.uiLayoutJson }));
  });
});
