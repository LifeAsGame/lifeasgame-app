import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MediaInfo, MediaUpdateRequest } from "@/shared/api/types";
import { mediaMock, resetJournalMock } from "./mock";
import { changedMediaFields, useMediaQueries } from "./useMediaQueries";

const api = vi.hoisted(() => ({ advanceMediaApi: vi.fn(), createMediaApi: vi.fn(), deleteMediaApi: vi.fn(), markMediaStatusApi: vi.fn(), rateMediaApi: vi.fn(), rewatchMediaApi: vi.fn(), searchMediaApi: vi.fn(), updateMediaApi: vi.fn() }));
vi.mock("./api", () => api);

const first: MediaInfo = { id: 51, playerId: 7, category: "ANIME", title: "Frieren", originalTitle: "葬送のフリーレン", currentEpisode: 10, totalEpisode: 28, status: "WATCHING", rating: 4.5, tags: ["fantasy"], rewatchCount: 0, startedOn: "2026-08-01", finishedOn: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-10T00:00:00Z" };
const created: MediaInfo = { ...first, id: 99, title: "Server-created", status: "PLANNED", currentEpisode: 0 };
const updated: MediaInfo = { ...created, currentEpisode: 3, originalTitle: null, tags: [] };

describe("Media query/mutation state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchMediaApi.mockResolvedValueOnce([first]).mockResolvedValueOnce([created, first]).mockResolvedValueOnce([updated, first]).mockResolvedValueOnce([first]);
    api.createMediaApi.mockResolvedValue({ id: created.id });
    api.updateMediaApi.mockResolvedValue(updated);
    api.deleteMediaApi.mockResolvedValue({ id: created.id });
  });

  it("filter change는 page를 reset하고 page navigation/reload는 filters와 raw pagination을 보존한다", async () => {
    api.searchMediaApi.mockReset().mockResolvedValue([first]);
    const { result } = renderHook(() => useMediaQueries());
    await waitFor(() => expect(api.searchMediaApi).toHaveBeenCalledWith({ page: 0, size: 20 }));
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    act(() => result.current.select(first.id));
    act(() => result.current.changePage(3));
    expect(result.current.selectedId).toBeNull();
    expect(result.current.detail).toBeNull();
    await waitFor(() => expect(api.searchMediaApi).toHaveBeenLastCalledWith({ page: 3, size: 20 }));
    act(() => result.current.select(first.id));
    act(() => result.current.search("ANIME", "WATCHING", " Frieren "));
    expect(result.current.selectedId).toBeNull();
    expect(result.current.detail).toBeNull();
    await waitFor(() => expect(api.searchMediaApi).toHaveBeenLastCalledWith({ category: "ANIME", status: "WATCHING", titleLike: "Frieren", page: 0, size: 20 }));
    act(() => result.current.changePage(2));
    await waitFor(() => expect(api.searchMediaApi).toHaveBeenLastCalledWith({ category: "ANIME", status: "WATCHING", titleLike: "Frieren", page: 2, size: 20 }));
    expect(result.current.list.items).toEqual([first]);
  });

  it("ignores a stale server-backed search response", async () => {
    let resolveStale!: (items: MediaInfo[]) => void;
    const stale = new Promise<MediaInfo[]>((resolve) => { resolveStale = resolve; });
    api.searchMediaApi.mockReset()
      .mockResolvedValueOnce([first])
      .mockReturnValueOnce(stale)
      .mockResolvedValueOnce([created]);
    const { result } = renderHook(() => useMediaQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));

    act(() => result.current.search("ANIME", undefined, "old"));
    act(() => result.current.search("ANIME", undefined, "new"));
    await waitFor(() => expect(result.current.list.items).toEqual([created]));
    await act(async () => { resolveStale([first]); await stale; });

    expect(result.current.list.items).toEqual([created]);
  });

  it("create ID는 reload row만 선택하고 PATCH response/reload를 적용하며 selected delete를 clear한다", async () => {
    const { result } = renderHook(() => useMediaQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    await act(async () => { await result.current.create({ category: "ANIME", title: "Submitted", status: "PLANNED" }); });
    expect(result.current.detail).toEqual(created);

    await act(async () => { await result.current.update(created.id, { currentEpisode: 3, originalTitle: "", tags: [] }); });
    expect(api.updateMediaApi).toHaveBeenCalledWith(created.id, { currentEpisode: 3, originalTitle: "", tags: [] });
    expect(result.current.detail).toEqual(updated);

    await act(async () => { await result.current.remove(created.id); });
    expect(result.current.selectedId).toBeNull();
    expect(result.current.detail).toBeNull();
    expect(api.searchMediaApi).toHaveBeenCalledTimes(4);
  });
});

describe("Media selected command state를 관리할 때", () => {
  beforeEach(() => vi.clearAllMocks());

  it("selected-only lock과 authoritative response를 지키고 failed refresh에도 command를 retry하지 않는다", async () => {
    const advanced = { ...first, currentEpisode: 11, updatedAt: "2026-08-14T00:00:00Z" };
    let resolveAdvance!: (value: MediaInfo) => void;
    api.searchMediaApi.mockResolvedValueOnce([first]).mockRejectedValueOnce(new Error("refresh failed"));
    api.advanceMediaApi.mockImplementation(() => new Promise<MediaInfo>((resolve) => { resolveAdvance = resolve; }));
    const { result } = renderHook(() => useMediaQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));

    await expect(result.current.rate(first.id, 5)).resolves.toBe(false);
    expect(api.rateMediaApi).not.toHaveBeenCalled();
    act(() => result.current.select(first.id));

    let command!: Promise<boolean>;
    act(() => { command = result.current.advance(first.id); });
    await waitFor(() => expect(result.current.pendingMutation).toBe(`advance-${first.id}`));
    await expect(result.current.rewatch(first.id)).resolves.toBe(false);
    expect(api.rewatchMediaApi).not.toHaveBeenCalled();

    await act(async () => { resolveAdvance(advanced); await command; });
    expect(api.advanceMediaApi).toHaveBeenCalledTimes(1);
    expect(api.advanceMediaApi).toHaveBeenCalledWith(first.id, { step: 1 });
    expect(result.current.detail).toEqual(advanced);
    expect(result.current.mutationError).toBe("Media changed, but the authoritative list could not be refreshed.");
    expect(api.searchMediaApi).toHaveBeenCalledTimes(2);
  });
});

describe("Media PATCH preserve/clear body를 만들 때", () => {
  beforeEach(() => resetJournalMock());

  it("changed-only one-sided progress와 deliberate clears만 포함하고 rating은 배제한다", () => {
    expect(changedMediaFields(first, { currentEpisode: 11 })).toEqual({ currentEpisode: 11 });
    expect(changedMediaFields(first, { totalEpisode: 30 })).toEqual({ totalEpisode: 30 });
    expect(changedMediaFields(first, {})).toEqual({});
    expect(changedMediaFields(first, { originalTitle: "", tags: [] })).toEqual({ originalTitle: "", tags: [] });
    expect(changedMediaFields(first, { currentEpisode: 11, rating: 5 } as MediaUpdateRequest & { rating: number })).toEqual({ currentEpisode: 11 });

    expect(() => mediaMock.update(202, { currentEpisode: 617 })).toThrow("Invalid Media episode progress.");
    expect(mediaMock.search({ category: "BOOK", titleLike: "data", page: 0, size: 20 })[0]).toEqual(expect.objectContaining({ currentEpisode: 250, totalEpisode: 616 }));

    const result = mediaMock.update(202, { currentEpisode: 251, originalTitle: "", tags: [] });
    expect(result).toEqual(expect.objectContaining({ currentEpisode: 251, totalEpisode: 616, originalTitle: null, tags: [], rating: 4.8 }));
  });
});
