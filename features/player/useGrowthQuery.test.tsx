import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EMPTY_PLAYER_GROWTH, MOCK_PLAYER_GROWTH } from "./mock";
import { useGrowthQuery } from "./useGrowthQuery";

const api = vi.hoisted(() => ({ getPlayerGrowthApi: vi.fn() }));
vi.mock("./api", () => api);

describe("Current Player Growth read state를 관리할 때", () => {
  beforeEach(() => vi.clearAllMocks());

  it("initial load와 error/retry를 feature state 안에서 유지한다", async () => {
    api.getPlayerGrowthApi.mockResolvedValueOnce(MOCK_PLAYER_GROWTH);
    const first = renderHook(() => useGrowthQuery());
    await waitFor(() => expect(first.result.current.data).toEqual(MOCK_PLAYER_GROWTH));
    expect(first.result.current.error).toBeNull();
    first.unmount();

    api.getPlayerGrowthApi.mockRejectedValueOnce(new Error("growth failed")).mockResolvedValueOnce(EMPTY_PLAYER_GROWTH);
    const retry = renderHook(() => useGrowthQuery());
    await waitFor(() => expect(retry.result.current.error).toBe("growth failed"));
    await act(async () => { await retry.result.current.retry(); });
    expect(retry.result.current.data).toEqual(EMPTY_PLAYER_GROWTH);
    expect(retry.result.current.loading).toBe(false);
    expect(retry.result.current.error).toBeNull();
  });
});
