import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalDetail, JournalPage } from "@/shared/api/types";
import { journalMock } from "./mock";
import { useJournalQueries } from "./useJournalQueries";

const api = vi.hoisted(() => ({
  getJournalDetailApi: vi.fn(),
  listJournalApi: vi.fn(),
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

const page = journalMock.page({ page: 0, size: 20 });

describe("Journal server query state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listJournalApi.mockResolvedValue(page);
    api.getJournalDetailApi.mockImplementation(async (lifeLogId: number) => journalMock.detail(lifeLogId));
  });

  describe("filter 또는 page를 변경하면", () => {
    it("기존 filter를 보존하고 filter 변경 시 page를 0으로 되돌린다", async () => {
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledWith({ page: 0, size: 20 }));

      act(() => result.current.changeRoleFilter(2));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ page: 0, size: 20, primaryRoleId: 2 }));
      act(() => result.current.changePage(1));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ page: 1, size: 20, primaryRoleId: 2 }));
      act(() => result.current.changeSubtypeFilter("REFLECTION"));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ page: 0, size: 20, primaryRoleId: 2, subtype: "REFLECTION" }));
    });

    it("authoritative page에 기존 lifeLogId가 없으면 selection과 detail을 clear한다", async () => {
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data.content).toHaveLength(4));
      act(() => result.current.selectEntry(104));
      await waitFor(() => expect(result.current.detail.data?.lifeLogId).toBe(104));
      api.listJournalApi.mockResolvedValueOnce({ ...page, content: [], totalElements: 0, totalPages: 0 });

      act(() => result.current.changeRoleFilter(999));

      await waitFor(() => expect(result.current.selectedLifeLogId).toBeNull());
      expect(result.current.detail.data).toBeNull();
    });
  });

  describe("겹친 list request가 역순으로 끝나면", () => {
    it("stale success가 최신 filter page와 loading을 덮어쓰지 않는다", async () => {
      const stale = deferred<JournalPage>();
      const latest = deferred<JournalPage>();
      const latestPage = journalMock.page({ subtype: "ACTIVITY", page: 0, size: 20 });
      api.listJournalApi.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledTimes(1));
      act(() => result.current.changeSubtypeFilter("ACTIVITY"));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledTimes(2));

      await act(async () => {
        latest.resolve(latestPage);
        await latest.promise;
      });
      expect(result.current.list.data).toEqual(latestPage);

      await act(async () => {
        stale.resolve(page);
        await stale.promise;
      });
      expect(result.current.list.data).toEqual(latestPage);
      expect(result.current.list.loading).toBe(false);
    });

    it("stale error가 최신 request의 loading/error를 바꾸지 않는다", async () => {
      const stale = deferred<JournalPage>();
      const latest = deferred<JournalPage>();
      api.listJournalApi.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledTimes(1));
      act(() => result.current.changeRoleFilter(1));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledTimes(2));

      await act(async () => {
        stale.reject(new Error("stale list failure"));
        await stale.promise.catch(() => undefined);
      });
      expect(result.current.list.loading).toBe(true);
      expect(result.current.list.error).toBeNull();

      await act(async () => {
        latest.resolve(journalMock.page({ primaryRoleId: 1, page: 0, size: 20 }));
        await latest.promise;
      });
      expect(result.current.list.loading).toBe(false);
      expect(result.current.list.error).toBeNull();
    });
  });

  describe("detail selection을 빠르게 바꾸면", () => {
    it("stale detail success가 최신 lifeLogId detail을 덮어쓰지 않는다", async () => {
      const stale = deferred<JournalDetail>();
      const latest = deferred<JournalDetail>();
      api.getJournalDetailApi.mockImplementation((lifeLogId: number) => lifeLogId === 104 ? stale.promise : latest.promise);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data.content).toHaveLength(4));

      act(() => result.current.selectEntry(104));
      act(() => result.current.selectEntry(103));
      await act(async () => {
        latest.resolve(journalMock.detail(103));
        await latest.promise;
      });
      expect(result.current.detail.data?.lifeLogId).toBe(103);

      await act(async () => {
        stale.resolve(journalMock.detail(104));
        await stale.promise;
      });
      expect(result.current.selectedLifeLogId).toBe(103);
      expect(result.current.detail.data?.lifeLogId).toBe(103);
    });

    it("stale detail error가 최신 selection의 loading/error를 바꾸지 않는다", async () => {
      const stale = deferred<JournalDetail>();
      const latest = deferred<JournalDetail>();
      api.getJournalDetailApi.mockImplementation((lifeLogId: number) => lifeLogId === 104 ? stale.promise : latest.promise);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data.content).toHaveLength(4));

      act(() => result.current.selectEntry(104));
      act(() => result.current.selectEntry(103));
      await act(async () => {
        stale.reject(new Error("stale detail failure"));
        await stale.promise.catch(() => undefined);
      });
      expect(result.current.detail.loading).toBe(true);
      expect(result.current.detail.error).toBeNull();

      await act(async () => {
        latest.resolve(journalMock.detail(103));
        await latest.promise;
      });
      expect(result.current.detail.data?.lifeLogId).toBe(103);
      expect(result.current.detail.loading).toBe(false);
      expect(result.current.detail.error).toBeNull();
    });
  });
});
