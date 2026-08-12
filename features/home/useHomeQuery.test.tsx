import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HomeSummary } from "./model";
import { MOCK_HOME_SUMMARY } from "./mock";
import { useHomeQuery } from "./useHomeQuery";

const api = vi.hoisted(() => ({ getHomeApi: vi.fn() }));

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

describe("Home server query state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getHomeApi.mockResolvedValue(structuredClone(MOCK_HOME_SUMMARY));
  });

  describe("처음 mount하면", () => {
    it("Home request 하나만 보내고 loading 뒤 result를 보존한다", async () => {
      const request = deferred<HomeSummary>();
      api.getHomeApi.mockReturnValue(request.promise);
      const { result } = renderHook(() => useHomeQuery());

      await waitFor(() => expect(result.current.loading).toBe(true));
      expect(result.current.data).toBeNull();
      expect(api.getHomeApi).toHaveBeenCalledOnce();

      await act(async () => {
        request.resolve(structuredClone(MOCK_HOME_SUMMARY));
        await request.promise;
      });
      expect(result.current.data).toEqual(MOCK_HOME_SUMMARY);
      expect(result.current.loading).toBe(false);
    });
  });

  describe("request가 실패하면", () => {
    it("error를 표시하고 retry 성공 시 같은 query state를 복구한다", async () => {
      api.getHomeApi.mockRejectedValueOnce(new Error("Home unavailable"));
      const { result } = renderHook(() => useHomeQuery());

      await waitFor(() => expect(result.current.error).toBe("Home unavailable"));
      await act(async () => { await result.current.reload(); });

      expect(api.getHomeApi).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual(MOCK_HOME_SUMMARY);
      expect(result.current.error).toBeNull();
    });
  });

  describe("겹친 request가 역순으로 끝나면", () => {
    it("stale success가 최신 Home success를 덮어쓰지 않는다", async () => {
      const stale = deferred<HomeSummary>();
      const latest = deferred<HomeSummary>();
      const latestSummary = { ...structuredClone(MOCK_HOME_SUMMARY), generatedAt: "2026-08-12T10:00:00Z" };
      api.getHomeApi.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useHomeQuery());
      await waitFor(() => expect(api.getHomeApi).toHaveBeenCalledOnce());

      act(() => { void result.current.reload(); });
      await act(async () => {
        latest.resolve(latestSummary);
        await latest.promise;
      });
      expect(result.current.data?.generatedAt).toBe(latestSummary.generatedAt);

      await act(async () => {
        stale.resolve(structuredClone(MOCK_HOME_SUMMARY));
        await stale.promise;
      });
      expect(result.current.data?.generatedAt).toBe(latestSummary.generatedAt);
      expect(result.current.loading).toBe(false);
    });

    it("stale error가 최신 Home data/loading/error를 바꾸지 않는다", async () => {
      const stale = deferred<HomeSummary>();
      const latest = deferred<HomeSummary>();
      api.getHomeApi.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useHomeQuery());
      await waitFor(() => expect(api.getHomeApi).toHaveBeenCalledOnce());

      act(() => { void result.current.reload(); });
      await act(async () => {
        stale.reject(new Error("stale Home failure"));
        await stale.promise.catch(() => undefined);
      });
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();

      await act(async () => {
        latest.resolve(structuredClone(MOCK_HOME_SUMMARY));
        await latest.promise;
      });
      expect(result.current.data).toEqual(MOCK_HOME_SUMMARY);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
