import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useExchangeQueries } from "./useExchangeQueries";

const api = vi.hoisted(() => ({
  getWalletApi: vi.fn(),
  getShopItemsApi: vi.fn(),
  getShopPurchasesApi: vi.fn(),
  getOpenListingsApi: vi.fn(),
  getMyListingsApi: vi.fn(),
  getTradesApi: vi.fn(),
  getInventoryApi: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/market.api", () => api);
vi.mock("@/lib/api/endpoints/inventory.api", () => ({ getInventoryApi: api.getInventoryApi }));

describe("Exchange read ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getWalletApi.mockResolvedValue({ amount: 900, currency: "GOLD" });
    api.getShopItemsApi.mockResolvedValue([]);
    api.getShopPurchasesApi.mockResolvedValue([]);
    api.getOpenListingsApi.mockResolvedValue([]);
    api.getMyListingsApi.mockResolvedValue([]);
    api.getTradesApi.mockResolvedValue([]);
    api.getInventoryApi.mockResolvedValue({ entries: [] });
  });

  it("loads only the selected canonical surface and switches Shop data on together", async () => {
    const view = renderHook(({ surface }) => useExchangeQueries(surface), { initialProps: { surface: "wallet" as "wallet" | "shop" | "trade" | null } });

    await waitFor(() => expect(view.result.current.wallet.data).toEqual({ amount: 900, currency: "GOLD" }));
    expect(api.getShopItemsApi).not.toHaveBeenCalled();
    expect(api.getTradesApi).not.toHaveBeenCalled();

    view.rerender({ surface: "shop" });
    await waitFor(() => expect(api.getInventoryApi).toHaveBeenCalledTimes(1));
    expect(api.getShopItemsApi).toHaveBeenCalledTimes(1);
    expect(api.getShopPurchasesApi).toHaveBeenCalledTimes(1);
    expect(api.getOpenListingsApi).toHaveBeenCalledTimes(1);
    expect(api.getMyListingsApi).toHaveBeenCalledTimes(1);

    view.rerender({ surface: "trade" });
    await waitFor(() => expect(api.getTradesApi).toHaveBeenCalledTimes(1));
  });

  it("keeps the current value on failure and exposes a working retry", async () => {
    api.getWalletApi.mockRejectedValueOnce(new Error("Wallet offline")).mockResolvedValueOnce({ amount: 25, currency: "GEM" });
    const { result } = renderHook(() => useExchangeQueries("wallet"));

    await waitFor(() => expect(result.current.wallet.error).toBe("Wallet offline"));
    await act(async () => { await result.current.wallet.reload(); });

    expect(result.current.wallet.data).toEqual({ amount: 25, currency: "GEM" });
    expect(result.current.wallet.error).toBeNull();
  });
});
