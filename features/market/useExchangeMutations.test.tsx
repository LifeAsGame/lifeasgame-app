import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ExchangeQueries } from "./useExchangeQueries";
import { useExchangeMutations } from "./useExchangeMutations";

const api = vi.hoisted(() => ({
  initiateShopPurchaseApi: vi.fn(),
  confirmShopPurchaseApi: vi.fn(),
  createListingApi: vi.fn(),
  cancelListingApi: vi.fn(),
  reserveListingApi: vi.fn(),
  purchaseListingApi: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/market.api", () => api);

const UUIDS = [
  "00000000-0000-4000-8000-000000000001",
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
] as const;
const query = <T,>(data: T, reloadValue = data) => ({ data, loading: false, error: null, reload: vi.fn().mockResolvedValue(reloadValue) });

function queries(): ExchangeQueries {
  return {
    wallet: query({ amount: 100, currency: "GOLD" as const }),
    shopItems: query([]),
    shopPurchases: query([]),
    openListings: query([]),
    myListings: query([]),
    inventory: query([]),
    trades: query([]),
  };
}

describe("Exchange command ownership", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    let index = 0;
    vi.spyOn(globalThis.crypto, "randomUUID").mockImplementation(() => UUIDS[index++] ?? UUIDS[2]);
  });

  it("reuses one Shop start key while unresolved and creates a new key after success", async () => {
    api.initiateShopPurchaseApi
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({ id: 41 })
      .mockResolvedValueOnce({ id: 42 });
    const state = queries();
    vi.mocked(state.shopPurchases.reload).mockResolvedValue([
      { id: 41, shopItemId: 2, quantity: 1, status: "RESERVED", reservationToken: "token-41", reservationExpiresAt: "2026-08-23T01:00:00Z" },
      { id: 42, shopItemId: 2, quantity: 1, status: "RESERVED", reservationToken: "token-42", reservationExpiresAt: "2026-08-23T02:00:00Z" },
    ]);
    const { result } = renderHook(() => useExchangeMutations(state));
    const item = { id: 2, itemId: 9, price: 30, currency: "GEM" as const, available: true, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 60 };

    await act(async () => { await result.current.startShopPurchase(item); });
    await act(async () => { await result.current.startShopPurchase(item); });
    await act(async () => { await result.current.startShopPurchase(item); });

    const keys = api.initiateShopPurchaseApi.mock.calls.map(([request]) => request.idempotencyKey);
    expect(keys).toEqual([UUIDS[0], UUIDS[0], UUIDS[1]]);
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("reuses one Shop confirm key while unresolved and clears it after completed history", async () => {
    api.confirmShopPurchaseApi
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({ reservationToken: "shop-token", expiresAt: "2026-08-23T01:00:00Z" })
      .mockResolvedValueOnce({ reservationToken: "shop-token", expiresAt: "2026-08-23T01:00:00Z" });
    const state = queries();
    vi.mocked(state.shopPurchases.reload).mockResolvedValue([
      { id: 41, shopItemId: 2, quantity: 1, status: "COMPLETED", reservationToken: "shop-token", reservationExpiresAt: "2026-08-23T01:00:00Z" },
    ]);
    const { result } = renderHook(() => useExchangeMutations(state));
    const purchase = { id: 41, shopItemId: 2, quantity: 1, status: "RESERVED", reservationToken: "shop-token", reservationExpiresAt: "2026-08-23T01:00:00Z" };

    await act(async () => { await result.current.confirmShopPurchase(purchase); });
    await act(async () => { await result.current.confirmShopPurchase(purchase); });
    await act(async () => { await result.current.confirmShopPurchase(purchase); });

    const keys = api.confirmShopPurchaseApi.mock.calls.map(([, key]) => key);
    expect(keys).toEqual([UUIDS[0], UUIDS[0], UUIDS[1]]);
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(2);
  });

  it("reuses one Marketplace purchase key while unresolved and creates a new key after trade success", async () => {
    api.purchaseListingApi
      .mockRejectedValueOnce(new Error("response lost"))
      .mockResolvedValueOnce({ id: 9, listingId: 8, buyerId: 7, sellerId: 4, price: 70, currency: "GOLD" })
      .mockResolvedValueOnce({ id: 10, listingId: 8, buyerId: 7, sellerId: 4, price: 70, currency: "GOLD" });
    const state = queries();
    const { result } = renderHook(() => useExchangeMutations(state));
    const listing = { id: 8, itemId: 90, sellerId: 4, price: 70, currency: "GOLD" as const, status: "OPEN" };

    await act(async () => { await result.current.purchaseListing(listing, "listing-token"); });
    await act(async () => { await result.current.purchaseListing(listing, "listing-token"); });
    await act(async () => { await result.current.purchaseListing(listing, "listing-token"); });

    const keys = api.purchaseListingApi.mock.calls.map(([, , key]) => key);
    expect(keys).toEqual([UUIDS[0], UUIDS[0], UUIDS[1]]);
    expect(globalThis.crypto.randomUUID).toHaveBeenCalledTimes(2);
    expect(state.openListings.reload).toHaveBeenCalledTimes(2);
    expect(state.trades.reload).toHaveBeenCalledTimes(2);
    expect(state.wallet.reload).toHaveBeenCalledTimes(2);
    expect(state.inventory.reload).toHaveBeenCalledTimes(2);
  });

  it("keeps an accepted purchase id when history has not caught up instead of starting again", async () => {
    api.initiateShopPurchaseApi.mockResolvedValue({ id: 99 });
    const state = queries();
    const { result } = renderHook(() => useExchangeMutations(state));
    const item = { id: 2, itemId: 9, price: 30, currency: "GEM" as const, available: true, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 60 };

    let attempt;
    await act(async () => { attempt = await result.current.startShopPurchase(item); });

    expect(attempt).toEqual({ purchaseId: 99, purchase: null });
    expect(result.current.error).toContain("purchase history is not available");
    expect(api.initiateShopPurchaseApi).toHaveBeenCalledTimes(1);
  });

  it("keeps whole-entry listing mapping and authoritative reloads unchanged", async () => {
    api.createListingApi.mockResolvedValue({ id: 77 });
    const state = queries();
    const { result } = renderHook(() => useExchangeMutations(state));

    await act(async () => {
      await result.current.createListing({ itemInstanceId: 501, slotIndex: 3, itemId: 90, itemName: "Owned Stack", category: "MATERIAL", type: "ORE", rarity: "RARE", stackable: true, maxStack: 99, quantity: 12, bound: false, durability: null, instanceAttrs: {} }, 12_000, "GEM");
    });

    expect(api.createListingApi).toHaveBeenCalledWith({ inventoryEntryId: 501, price: 12_000, currency: "GEM" });
    expect(state.myListings.reload).toHaveBeenCalledTimes(1);
    expect(state.openListings.reload).toHaveBeenCalledTimes(1);
    expect(state.inventory.reload).toHaveBeenCalledTimes(1);
  });
});
