import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerTitleInfo } from "@/shared/api/types";
import { MOCK_CHARACTER_SHEET } from "./mock";
import { useTitleQueries } from "./useTitleQueries";

const api = vi.hoisted(() => ({
  getCurrentPlayerApi: vi.fn(),
  getPlayerTitlesApi: vi.fn(),
  setRepresentativeTitleApi: vi.fn(),
}));

vi.mock("./api", () => api);

const titles: PlayerTitleInfo[] = [
  { titleId: 1, code: "FIRST", name: "First", category: "Combat", descMd: "First title.", acquiredAt: "2026-08-01T00:00:00Z" },
  { titleId: 2, code: "SECOND", name: "Second", category: "Growth", descMd: "Second title.", acquiredAt: "2026-08-02T00:00:00Z" },
];
const player = { ...MOCK_CHARACTER_SHEET.player, representativeTitleId: 1 };

describe("Title query/mutation state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPlayerTitlesApi.mockResolvedValue(titles);
    api.getCurrentPlayerApi.mockResolvedValue(player);
    api.setRepresentativeTitleApi.mockResolvedValue({ titleId: 2 });
  });

  it("authority를 함께 로드하고 PATCH 후 Player를 새로 읽으며 no-op과 refresh failure에서 state를 만들지 않는다", async () => {
    const { result } = renderHook(() => useTitleQueries());
    await waitFor(() => expect(result.current.titles.items).toEqual(titles));
    await waitFor(() => expect(result.current.representativeTitleId).toBe(1));

    await act(async () => { await result.current.setRepresentative(1); });
    expect(api.setRepresentativeTitleApi).not.toHaveBeenCalled();

    act(() => result.current.select(2));
    api.getCurrentPlayerApi.mockResolvedValueOnce({ ...player, representativeTitleId: 2 });
    await act(async () => { await result.current.setRepresentative(2); });
    expect(api.setRepresentativeTitleApi).toHaveBeenCalledWith(2);
    expect(api.getCurrentPlayerApi).toHaveBeenCalledTimes(2);
    expect(result.current.representativeTitleId).toBe(2);

    api.getCurrentPlayerApi.mockRejectedValueOnce(new Error("refresh failed"));
    api.setRepresentativeTitleApi.mockResolvedValueOnce({ titleId: 1 });
    await act(async () => { await result.current.setRepresentative(1); });
    expect(result.current.representativeTitleId).toBe(2);
    expect(result.current.mutationError).toMatch(/authority could not be reloaded/);
  });
});
