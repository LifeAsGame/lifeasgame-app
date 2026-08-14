import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExerciseInfo } from "@/shared/api/types";
import { useExerciseQueries } from "./useExerciseQueries";

const api = vi.hoisted(() => ({
  createExerciseApi: vi.fn(),
  deleteExerciseApi: vi.fn(),
  getExerciseApi: vi.fn(),
  searchExercisesApi: vi.fn(),
  updateExerciseApi: vi.fn(),
}));

vi.mock("./api", () => api);

const first: ExerciseInfo = { id: 41, playerId: 7, category: "RUNNING", durationMinutes: 30, distanceKm: 5, calories: 250, exercisedOn: "2026-08-14", memo: "Morning run", createdAt: "2026-08-14T00:00:00Z", updatedAt: "2026-08-14T00:00:00Z" };
const created = { ...first, id: 99, category: "YOGA" as const, memo: "Server detail" };
const updated = { ...created, durationMinutes: 45, distanceKm: 5, memo: null };

describe("Exercise query/mutation state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchExercisesApi.mockResolvedValue([first]);
    api.getExerciseApi.mockImplementation(async (id: number) => id === created.id ? created : first);
    api.createExerciseApi.mockResolvedValue({ id: created.id });
    api.updateExerciseApi.mockResolvedValue(updated);
    api.deleteExerciseApi.mockResolvedValue({ id: created.id });
  });

  it("search는 page를 reset하고 filters/page를 reload마다 보존한다", async () => {
    const { result } = renderHook(() => useExerciseQueries());
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenCalledWith({ page: 0, size: 20 }));

    act(() => result.current.changePage(3));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenLastCalledWith({ page: 3, size: 20 }));
    act(() => result.current.search("RUNNING", "2026-08-01", "2026-08-14"));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenLastCalledWith({ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 0, size: 20 }));
    act(() => result.current.changePage(2));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenLastCalledWith({ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 2, size: 20 }));
    await act(async () => { await result.current.list.reload(); });
    expect(api.searchExercisesApi).toHaveBeenLastCalledWith({ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 2, size: 20 });
  });

  it("create reload 후 returned ID를 fetch/select하고 update reload, delete clear를 수행한다", async () => {
    const { result } = renderHook(() => useExerciseQueries());
    await waitFor(() => expect(result.current.list.items).toEqual([first]));
    act(() => result.current.search("RUNNING", "2026-08-01", "2026-08-14"));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenCalledTimes(2));
    act(() => result.current.changePage(2));
    await waitFor(() => expect(api.searchExercisesApi).toHaveBeenCalledTimes(3));

    await act(async () => { await result.current.create({ category: "YOGA", durationMinutes: 45, exercisedOn: "2026-08-14" }); });
    await waitFor(() => expect(result.current.detail.data).toEqual(created));
    expect(api.getExerciseApi).toHaveBeenCalledWith(created.id);

    await act(async () => { await result.current.update(created.id, { durationMinutes: 45, memo: "" }); });
    expect(result.current.detail.data).toEqual(updated);

    await act(async () => { await result.current.remove(created.id); });
    expect(result.current.selectedId).toBeNull();
    expect(result.current.detail.data).toBeNull();
    expect(api.searchExercisesApi.mock.calls.slice(3)).toEqual([
      [{ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 2, size: 20 }],
      [{ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 2, size: 20 }],
      [{ category: "RUNNING", from: "2026-08-01", to: "2026-08-14", page: 2, size: 20 }],
    ]);
  });
});
