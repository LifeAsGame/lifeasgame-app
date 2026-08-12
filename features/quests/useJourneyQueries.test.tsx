import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { QuestAcceptance } from "@/shared/api/types";
import { journeyMock, resetJourneyMock } from "./mock";
import { useJourneyQueries } from "./useJourneyQueries";

const api = vi.hoisted(() => ({
  listMyQuestRoutesApi: vi.fn(),
  listPlayerQuestsApi: vi.fn(),
  listQuestCatalogApi: vi.fn(),
  listQuestRoutesApi: vi.fn(),
}));

vi.mock("./api", () => api);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("Journey query를 겹쳐 reload할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetJourneyMock();
    api.listQuestCatalogApi.mockResolvedValue([]);
    api.listQuestRoutesApi.mockResolvedValue([]);
    api.listMyQuestRoutesApi.mockResolvedValue([]);
  });

  describe("이전 요청이 최신 요청보다 늦게 끝나면", () => {
    it("stale success가 최신 data를 덮어쓰지 않는다", async () => {
      const first = deferred<QuestAcceptance[]>();
      const latest = journeyMock.acceptances().slice(0, 1);
      api.listPlayerQuestsApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce(latest);
      const { result } = renderHook(() => useJourneyQueries(true));

      await waitFor(() => expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(1));
      await act(async () => {
        await result.current.current.reload();
      });
      expect(result.current.current.data).toEqual(latest);

      await act(async () => {
        first.resolve(journeyMock.acceptances());
        await first.promise;
      });

      expect(result.current.current.data).toEqual(latest);
      expect(result.current.current.loading).toBe(false);
      expect(result.current.current.error).toBeNull();
    });

    it("stale error가 최신 loading/error 상태를 바꾸지 않는다", async () => {
      const first = deferred<QuestAcceptance[]>();
      const latest = deferred<QuestAcceptance[]>();
      api.listPlayerQuestsApi.mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useJourneyQueries(true));

      await waitFor(() => expect(api.listPlayerQuestsApi).toHaveBeenCalledTimes(1));
      let latestReload!: Promise<QuestAcceptance[] | undefined>;
      act(() => {
        latestReload = result.current.current.reload();
      });

      await act(async () => {
        first.reject(new Error("stale failure"));
        await first.promise.catch(() => undefined);
      });
      expect(result.current.current.loading).toBe(true);
      expect(result.current.current.error).toBeNull();

      const latestData = journeyMock.acceptances().slice(1, 2);
      await act(async () => {
        latest.resolve(latestData);
        await latestReload;
      });
      expect(result.current.current.data).toEqual(latestData);
      expect(result.current.current.loading).toBe(false);
      expect(result.current.current.error).toBeNull();
    });
  });
});
