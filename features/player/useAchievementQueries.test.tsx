import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import { useAchievementQueries } from "./useAchievementQueries";

const api = vi.hoisted(() => ({ getPlayerAchievementApi: vi.fn(), getPlayerAchievementsApi: vi.fn() }));

vi.mock("./api", () => api);

const first: PlayerAchievementInfo = { achievementId: 1, code: "FIRST", name: "First", category: "Growth", descMd: "First detail", acquiredAt: "2026-08-13T00:00:00Z" };
const second: PlayerAchievementInfo = { achievementId: 2, code: "SECOND", name: "Second", category: "Growth", descMd: "Second detail", acquiredAt: "2026-08-14T00:00:00Z" };

describe("Achievement list/detail state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getPlayerAchievementsApi.mockResolvedValue([first, second]);
  });

  it("initial list, selected detail, stale response protection, selected retry를 한 흐름으로 유지한다", async () => {
    const pending = new Map<number, { resolve: (value: PlayerAchievementInfo) => void; reject: (error: Error) => void }>();
    api.getPlayerAchievementApi.mockImplementation((id: number) => new Promise<PlayerAchievementInfo>((resolve, reject) => pending.set(id, { resolve, reject })));
    const { result } = renderHook(() => useAchievementQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first, second]));

    act(() => result.current.select(first.achievementId));
    act(() => result.current.select(second.achievementId));
    await act(async () => pending.get(second.achievementId)!.resolve(second));
    expect(result.current.detail.data).toEqual(second);
    await act(async () => pending.get(first.achievementId)!.resolve(first));
    expect(result.current.detail.data).toEqual(second);

    act(() => result.current.select(second.achievementId));
    await act(async () => pending.get(second.achievementId)!.reject(new Error("detail failed")));
    await waitFor(() => expect(result.current.detail.error).toBe("detail failed"));
    api.getPlayerAchievementApi.mockResolvedValueOnce(second);
    await act(async () => { await result.current.detail.retry(); });

    expect(api.getPlayerAchievementApi).toHaveBeenLastCalledWith(second.achievementId);
    expect(result.current.detail.data).toEqual(second);
    expect(result.current.detail.error).toBeNull();
  });
});
