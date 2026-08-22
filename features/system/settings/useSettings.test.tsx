import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/features/theme/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/features/theme/theme";
import type { UserSettingsResponse } from "@/shared/api/types";
import { useSettings } from "./useSettings";

const api = vi.hoisted(() => ({ getSettingsApi: vi.fn(), updateSettingsApi: vi.fn() }));
vi.mock("@/lib/api/endpoints/settings.api", () => api);

const wrapper = ({ children }: { children: ReactNode }) => <ThemeProvider>{children}</ThemeProvider>;

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
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    api.getSettingsApi.mockResolvedValue(response());
  });

  it("protects invalid flags, exposes retry, and never PATCHes without safe canonical state", async () => {
    api.getSettingsApi.mockResolvedValueOnce(response({ flagsJson: "[]" })).mockResolvedValueOnce(response());
    const { result } = renderHook(() => useSettings(), { wrapper });
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
    const { result } = renderHook(() => useSettings(), { wrapper });
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
    const { result } = renderHook(() => useSettings(), { wrapper });
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

  it("loads the canonical form theme without changing runtime merely because Options mounted", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "ASTRAL");
    api.getSettingsApi.mockResolvedValue(response({ flagsJson: JSON.stringify({ themePreference: "WARM_BEIGE", futureFlag: "preserve" }) }));
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(result.current.canonical).not.toBeNull());
    expect(result.current.themePreference).toBe("WARM_BEIGE");
    expect(document.documentElement.dataset.theme).toBe("astral");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("ASTRAL");
  });

  it("preserves a valid local preference when server flags omit themePreference", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "ASTRAL");
    let finishLoad!: (settings: UserSettingsResponse) => void;
    api.getSettingsApi.mockReturnValue(new Promise((resolve) => { finishLoad = resolve; }));
    const { result } = renderHook(() => useSettings(), { wrapper });

    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("astral"));
    await act(async () => { finishLoad(response()); });
    await waitFor(() => expect(result.current.canonical).not.toBeNull());
    expect(result.current.themePreference).toBe("ASTRAL");
    expect(result.current.canonical?.view.themePreference).toBe("ASTRAL");
    expect(document.documentElement.dataset.theme).toBe("astral");
  });

  it("applies a user theme choice immediately while its Settings PATCH is pending", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "ASTRAL");
    api.getSettingsApi.mockResolvedValue(response({ flagsJson: JSON.stringify({ themePreference: "ASTRAL" }) }));
    let finishSave!: (settings: UserSettingsResponse) => void;
    api.updateSettingsApi.mockReturnValue(new Promise((resolve) => { finishSave = resolve; }));
    const { result } = renderHook(() => useSettings(), { wrapper });
    await waitFor(() => expect(result.current.canonical).not.toBeNull());

    let saving!: Promise<boolean>;
    act(() => { saving = result.current.setThemePreference("WARM_BEIGE"); });
    expect(document.documentElement.dataset.theme).toBe("warm-beige");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("WARM_BEIGE");

    await act(async () => {
      finishSave(response({ flagsJson: JSON.stringify({ themePreference: "WARM_BEIGE" }) }));
      expect(await saving).toBe(true);
    });
  });
});
