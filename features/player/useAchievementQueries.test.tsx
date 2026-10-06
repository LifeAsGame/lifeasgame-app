import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlayerAchievementInfo } from "@/shared/api/types";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { AWARD_SOURCE_EVENT } from "./awardEvents";
import { useAchievementQueries } from "./useAchievementQueries";

const api = vi.hoisted(() => ({ getPlayerAchievementApi: vi.fn(), getPlayerAchievementsApi: vi.fn(), getAchievementDefinitionsApi: vi.fn(), getActivatedContentApi: vi.fn() }));

vi.mock("./api", () => api);

const first: PlayerAchievementInfo = { achievementId: 1, code: "FIRST", name: "First", category: "Growth", descMd: "First detail", acquiredAt: "2026-08-13T00:00:00Z" };
const second: PlayerAchievementInfo = { achievementId: 2, code: "SECOND", name: "Second", category: "Growth", descMd: "Second detail", acquiredAt: "2026-08-14T00:00:00Z" };

describe("Achievement list/detail state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tokenStorage.clear();
    api.getPlayerAchievementsApi.mockResolvedValue([first, second]);
    api.getAchievementDefinitionsApi.mockResolvedValue([]);
    api.getActivatedContentApi.mockResolvedValue({ entries: [], page: 0, size: 20, hasNext: false });
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

  it("Outbox 지연에는 횟수가 제한된 재조회만 하고 확인된 보유만 표시한다", async () => {
    api.getPlayerAchievementsApi.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([first]);
    const { result } = renderHook(() => useAchievementQueries());
    await waitFor(() => expect(result.current.list.loading).toBe(false));
    vi.useFakeTimers();
    await act(async () => { window.dispatchEvent(new Event(AWARD_SOURCE_EVENT)); });
    expect(result.current.list.items).toEqual([]);
    await act(async () => { await vi.advanceTimersByTimeAsync(900); });
    expect(result.current.list.items).toEqual([first]);
    await act(async () => { await vi.advanceTimersByTimeAsync(1300); });
    expect(api.getPlayerAchievementsApi).toHaveBeenCalledTimes(4);
    vi.useRealTimers();
  });

  it("계정 변경 후 이전 계정의 늦은 응답을 버린다", async () => {
    tokenStorage.write({ accessToken: "old", refreshToken: "old", userId: 1, playerId: 1 });
    let finishOld!: (items: PlayerAchievementInfo[]) => void;
    api.getPlayerAchievementsApi.mockReturnValueOnce(new Promise((resolve) => { finishOld = resolve; })).mockResolvedValueOnce([second]);
    const { result } = renderHook(() => useAchievementQueries());
    act(() => tokenStorage.write({ accessToken: "new", refreshToken: "new", userId: 2, playerId: 2 }));
    await waitFor(() => expect(result.current.list.items).toEqual([second]));
    await act(async () => finishOld([first]));
    expect(result.current.list.items).toEqual([second]);
    tokenStorage.clear();
  });
});
