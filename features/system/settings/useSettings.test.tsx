import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserSettingsResponse } from "@/shared/api/types";
import { useSettings } from "./useSettings";

const api = vi.hoisted(() => ({ getSettingsApi: vi.fn(), updateSettingsApi: vi.fn() }));
vi.mock("@/lib/api/endpoints/settings.api", () => api);

const response = (overrides: Partial<UserSettingsResponse> = {}): UserSettingsResponse => ({
  userId: 7,
  volume: 70,
  uiLayoutJson: "layout-owned-elsewhere",
  flagsJson: JSON.stringify({ graphicsQuality: "HIGH", futureFlag: "preserve" }),
  updatedAt: "2026-08-18T00:00:00Z",
  ...overrides,
});

describe("feature-owned Settings state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getSettingsApi.mockResolvedValue(response());
  });

  it("protects invalid flags, exposes retry, and never PATCHes without safe canonical state", async () => {
    api.getSettingsApi.mockResolvedValueOnce(response({ flagsJson: "[]" })).mockResolvedValueOnce(response());
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.error).toMatch(/cannot be edited safely/i));

    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(api.updateSettingsApi).not.toHaveBeenCalled();

    await act(async () => { await result.current.retry(); });
    expect(result.current.canonical?.view.volume).toBe(70);
    expect(result.current.draft).toEqual(result.current.canonical?.view);
  });

  it("uses the successful response as canonical and clears dirty state", async () => {
    api.updateSettingsApi.mockResolvedValue(response({
      volume: 66,
      flagsJson: JSON.stringify({ graphicsQuality: "LOW", futureFlag: "preserve", serverFlag: true }),
      updatedAt: "2026-08-18T01:00:00Z",
    }));
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.canonical).not.toBeNull());
    act(() => result.current.updateDraft({ volume: 65, graphicsQuality: "LOW" }));

    await act(async () => { expect(await result.current.save()).toBe(true); });

    expect(result.current.canonical?.view.volume).toBe(66);
    expect(result.current.canonical?.rawFlags.serverFlag).toBe(true);
    expect(result.current.draft).toEqual(result.current.canonical?.view);
    expect(result.current.dirty).toBe(false);
    const request = api.updateSettingsApi.mock.calls[0][0];
    expect(request).not.toHaveProperty("uiLayoutJson");
    expect(JSON.parse(request.flagsJson)).not.toHaveProperty("volume");
  });

  it("keeps the previous canonical state and edited draft after save failure, then cancel restores canonical", async () => {
    api.updateSettingsApi.mockRejectedValue(new Error("save failed"));
    const { result } = renderHook(() => useSettings());
    await waitFor(() => expect(result.current.canonical).not.toBeNull());
    act(() => result.current.updateDraft({ volume: 25 }));

    await act(async () => { expect(await result.current.save()).toBe(false); });
    expect(result.current.canonical?.view.volume).toBe(70);
    expect(result.current.draft?.volume).toBe(25);
    expect(result.current.saveError).toBe("save failed");

    act(() => result.current.cancel());
    expect(result.current.draft?.volume).toBe(70);
    expect(result.current.saveError).toBeNull();
  });
});
