import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { MOCK_HOME_SUMMARY } from "./mock";
import { useHomeQuery } from "./useHomeQuery";

const api = vi.hoisted(() => ({ getHomeApi: vi.fn() }));
vi.mock("./api", () => api);
beforeEach(() => { vi.resetAllMocks(); api.getHomeApi.mockResolvedValue(MOCK_HOME_SUMMARY); });

it("refreshes on Home return without remount, retains confirmed data on failure, and retries only the GET", async () => {
  const view = renderHook(({ active }) => useHomeQuery(active), { initialProps: { active: true } });
  await waitFor(() => expect(view.result.current.data).toBe(MOCK_HOME_SUMMARY));
  view.rerender({ active: false });
  view.rerender({ active: false });
  expect(api.getHomeApi).toHaveBeenCalledTimes(1);
  api.getHomeApi.mockRejectedValueOnce(new Error("offline"));
  view.rerender({ active: true });
  await waitFor(() => expect(view.result.current.error).toBe("offline"));
  expect(view.result.current.data).toBe(MOCK_HOME_SUMMARY);
  const updated = { ...MOCK_HOME_SUMMARY, generatedAt: "2026-09-29T12:00:00Z" };
  api.getHomeApi.mockResolvedValueOnce(updated);
  await act(async () => { await view.result.current.reload(); });
  expect(view.result.current.data).toBe(updated);
  expect(view.result.current.error).toBeNull();
  view.rerender({ active: true });
  expect(api.getHomeApi).toHaveBeenCalledTimes(3);
});

it("does not fetch behind the menu or apply a delayed previous Home visit over the latest visit", async () => {
  let finish!: (value: typeof MOCK_HOME_SUMMARY) => void;
  api.getHomeApi.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
  const view = renderHook(({ active }) => useHomeQuery(active), { initialProps: { active: false } });
  expect(api.getHomeApi).not.toHaveBeenCalled();
  view.rerender({ active: true });
  view.rerender({ active: false });
  view.rerender({ active: true });
  await waitFor(() => expect(view.result.current.data).toBe(MOCK_HOME_SUMMARY));
  await act(async () => { finish({ ...MOCK_HOME_SUMMARY, generatedAt: "stale" }); });
  expect(view.result.current.data).toBe(MOCK_HOME_SUMMARY);
  expect(api.getHomeApi).toHaveBeenCalledTimes(2);
});
