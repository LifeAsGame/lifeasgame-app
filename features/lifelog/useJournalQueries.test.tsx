import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalDetail, JournalPage, QuickRecordRequest, QuickRecordResult } from "@/shared/api/types";
import { journalMock } from "./mock";
import { useJournalQueries } from "./useJournalQueries";

const api = vi.hoisted(() => ({
  getJournalDetailApi: vi.fn(),
  listJournalApi: vi.fn(),
  quickRecordApi: vi.fn(),
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
const quickBody: QuickRecordRequest = {
  type: "COLLECTION",
  collection: { category: "BOOK", title: "Quick book", quantity: 1 },
};
const quickResult: QuickRecordResult = {
  sourceType: "COLLECTION",
  sourceId: 999,
  recordedAt: "2026-08-14T00:00:00Z",
  replay: false,
};
const quickEntry = { ...page.content[0], lifeLogId: 777, sourceId: 999, entryMode: "QUICK" as const };
const pageWithQuick = { ...page, content: [quickEntry, ...page.content], totalElements: page.totalElements + 1 };

describe("Journal server query state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listJournalApi.mockResolvedValue(page);
    api.getJournalDetailApi.mockImplementation(async (lifeLogId: number) => journalMock.detail(lifeLogId));
    api.quickRecordApi.mockResolvedValue(quickResult);
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

  describe("Quick Record logical submission을 수행하면", () => {
    it("failed Retry에 exact payload/key를 재사용하고 reload 결과의 canonical lifeLogId를 선택한다", async () => {
      api.quickRecordApi.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce({ ...quickResult, replay: true });
      api.listJournalApi.mockResolvedValueOnce(page).mockResolvedValueOnce(pageWithQuick);
      api.getJournalDetailApi.mockImplementation(async (lifeLogId: number) => ({ ...journalMock.detail(104), lifeLogId, sourceId: 999 }));
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data).toEqual(page));

      await act(async () => { await result.current.quickRecord.submit(quickBody); });
      const [failedBody, failedKey] = api.quickRecordApi.mock.calls[0];
      expect(result.current.quickRecord.canRetry).toBe(true);

      await act(async () => { await result.current.quickRecord.retry(); });

      expect(api.quickRecordApi).toHaveBeenNthCalledWith(2, failedBody, failedKey);
      expect(result.current.quickRecord.result?.replay).toBe(true);
      expect(result.current.selectedLifeLogId).toBe(777);
      expect(api.getJournalDetailApi).toHaveBeenCalledWith(777);
      expect(api.getJournalDetailApi).not.toHaveBeenCalledWith(999);
    });

    it("failure 뒤 edit는 retained Retry를 버리고 다음 Submit에 새 key를 만든다", async () => {
      api.quickRecordApi.mockRejectedValueOnce(new Error("ambiguous")).mockResolvedValueOnce(quickResult);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data).toEqual(page));

      await act(async () => { await result.current.quickRecord.submit(quickBody); });
      const firstKey = api.quickRecordApi.mock.calls[0][1];
      act(() => result.current.quickRecord.invalidateRetry());
      expect(result.current.quickRecord.canRetry).toBe(false);

      const edited = { ...quickBody, collection: { ...quickBody.collection, title: "Edited book" } } as QuickRecordRequest;
      await act(async () => { await result.current.quickRecord.submit(edited); });

      expect(api.quickRecordApi.mock.calls[1][1]).not.toBe(firstKey);
      expect(api.quickRecordApi.mock.calls[1][0]).toEqual(edited);
    });

    it("pending duplicate를 무시하고 authoritative reload 전에는 list를 optimistic 변경하지 않는다", async () => {
      const request = deferred<QuickRecordResult>();
      api.quickRecordApi.mockReturnValue(request.promise);
      api.listJournalApi.mockResolvedValueOnce(page).mockResolvedValueOnce(pageWithQuick);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data).toEqual(page));

      act(() => {
        void result.current.quickRecord.submit(quickBody);
        void result.current.quickRecord.submit(quickBody);
      });
      expect(api.quickRecordApi).toHaveBeenCalledOnce();
      expect(result.current.list.data).toEqual(page);

      await act(async () => {
        request.resolve(quickResult);
        await request.promise;
      });
      await waitFor(() => expect(result.current.list.data).toEqual(pageWithQuick));
    });

    it("current filter가 새 Source를 숨기면 filter를 보존하고 selection을 만들지 않는다", async () => {
      const filtered = journalMock.page({ primaryRoleId: 2, page: 0, size: 20 });
      api.listJournalApi.mockImplementation(async (params) => params.primaryRoleId === 2 ? filtered : page);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data).toEqual(page));
      act(() => result.current.changeRoleFilter(2));
      await waitFor(() => expect(result.current.params.primaryRoleId).toBe(2));

      await act(async () => { await result.current.quickRecord.submit(quickBody); });

      expect(result.current.params).toEqual({ page: 0, size: 20, primaryRoleId: 2 });
      expect(result.current.selectedLifeLogId).toBeNull();
      expect(api.getJournalDetailApi).not.toHaveBeenCalled();
    });

    it("pending 중 filter가 바뀌어도 post-save reload는 최신 filter를 사용한다", async () => {
      const request = deferred<QuickRecordResult>();
      const filtered = journalMock.page({ primaryRoleId: 2, page: 0, size: 20 });
      api.quickRecordApi.mockReturnValue(request.promise);
      api.listJournalApi.mockImplementation(async (params) => params.primaryRoleId === 2 ? filtered : page);
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data).toEqual(page));

      act(() => void result.current.quickRecord.submit(quickBody));
      act(() => result.current.changeRoleFilter(2));
      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledTimes(2));
      await act(async () => {
        request.resolve(quickResult);
        await request.promise;
      });

      await waitFor(() => expect(api.listJournalApi).toHaveBeenCalledTimes(3));
      expect(api.listJournalApi).toHaveBeenLastCalledWith({ page: 0, size: 20, primaryRoleId: 2 });
      expect(result.current.params.primaryRoleId).toBe(2);
      expect(result.current.selectedLifeLogId).toBeNull();
    });

    it("Journal reload 실패는 recording success를 유지하고 별도 refresh error를 남긴다", async () => {
      api.listJournalApi.mockResolvedValueOnce(page).mockRejectedValueOnce(new Error("Journal refresh unavailable"));
      const { result } = renderHook(() => useJournalQueries());
      await waitFor(() => expect(result.current.list.data).toEqual(page));

      let saved: QuickRecordResult | undefined;
      await act(async () => { saved = await result.current.quickRecord.submit(quickBody); });

      expect(saved).toEqual(quickResult);
      expect(result.current.quickRecord.result).toEqual(quickResult);
      expect(result.current.quickRecord.error).toBeNull();
      expect(result.current.quickRecord.refreshError).toContain("Quick Record succeeded");
      expect(result.current.list.error).toBe("Journal refresh unavailable");
    });
  });
});
