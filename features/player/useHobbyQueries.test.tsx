import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import { useHobbyQueries } from "./useHobbyQueries";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
vi.mock("./api", () => api);

const catalog: HobbyCatalogInfo[] = [{ hobbyId: 1, name: "Programming", category: "Tech" }, { hobbyId: 3, name: "Running", category: "Fitness" }];
const first: PlayerHobbyInfo = { ...catalog[0], customName: "Code", detail: null, proficiency: 80, status: "ACTIVE", startedOn: null, xp: 20 };
const registered: PlayerHobbyInfo = { ...catalog[1], customName: "Run", detail: null, proficiency: 50, status: "PAUSED", startedOn: null, xp: 0 };
const updated: PlayerHobbyInfo = { ...registered, proficiency: 60, status: "DROPPED" };

describe("Hobby query/mutation state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getHobbyCatalogApi.mockResolvedValue(catalog);
    api.getPlayerHobbiesApi.mockResolvedValueOnce([first]).mockResolvedValueOnce([first, registered]).mockResolvedValueOnce([first, updated]).mockResolvedValueOnce([first]);
    api.registerPlayerHobbyApi.mockResolvedValue(registered);
    api.updatePlayerHobbyApi.mockResolvedValue(updated);
    api.deletePlayerHobbyApi.mockResolvedValue(3);
  });

  it("initial load와 register/select, changed-only update/retain, delete/clear authoritative reload을 수행한다", async () => {
    const { result } = renderHook(() => useHobbyQueries());
    await waitFor(() => expect(result.current.catalog.items).toEqual(catalog));
    await waitFor(() => expect(result.current.owned.items).toEqual([first]));

    await act(async () => { await result.current.register(3, { customName: "Run", proficiency: 50, status: "PAUSED" }); });
    expect(result.current.selected).toEqual(registered);

    await act(async () => { await result.current.update(3, { customName: "Run", detail: "", proficiency: 60, status: "DROPPED", startedOn: "" }); });
    expect(api.updatePlayerHobbyApi).toHaveBeenCalledWith(3, { proficiency: 60, status: "DROPPED" });
    expect(result.current.selected).toEqual(updated);

    await act(async () => { await result.current.update(3, { customName: "Run", proficiency: 60, status: "DROPPED" }); });
    expect(api.updatePlayerHobbyApi).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.remove(3); });
    expect(result.current.selectedId).toBeNull();
    expect(api.getPlayerHobbiesApi).toHaveBeenCalledTimes(4);
  });
});
