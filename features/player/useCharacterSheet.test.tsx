import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MOCK_CHARACTER_SHEET } from "./mock";
import { useCharacterSheet } from "./useCharacterSheet";

const api = vi.hoisted(() => ({ getCharacterSheetApi: vi.fn() }));
vi.mock("@/lib/api/endpoints/player.api", () => api);

describe("Player context character sheet query", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads canonical data only when enabled and exposes a working retry", async () => {
    api.getCharacterSheetApi.mockRejectedValueOnce(new Error("Player unavailable")).mockResolvedValueOnce(MOCK_CHARACTER_SHEET);
    const view = renderHook(({ enabled }) => useCharacterSheet(enabled), { initialProps: { enabled: false } });
    expect(api.getCharacterSheetApi).not.toHaveBeenCalled();

    view.rerender({ enabled: true });
    await waitFor(() => expect(view.result.current.error).toBe("Player unavailable"));

    await act(async () => { await view.result.current.reload(); });
    expect(view.result.current.data).toEqual(MOCK_CHARACTER_SHEET);
    expect(api.getCharacterSheetApi).toHaveBeenCalledTimes(2);
  });

  it("does not publish a late response after the Player context closes", async () => {
    let resolve!: (value: typeof MOCK_CHARACTER_SHEET) => void;
    api.getCharacterSheetApi.mockReturnValue(new Promise((done) => { resolve = done; }));
    const view = renderHook(({ enabled }) => useCharacterSheet(enabled), { initialProps: { enabled: true } });

    view.rerender({ enabled: false });
    await act(async () => resolve(MOCK_CHARACTER_SHEET));

    expect(view.result.current.data).toBeNull();
    expect(view.result.current.loading).toBe(false);
  });
});
