import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ShopPurchaseSummary } from "@/shared/api/types";
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

const query = <T,>(data: T, reloadValue = data) => ({ data, loading: false, error: null, reload: vi.fn().mockResolvedValue(reloadValue) });

function queries(): ExchangeQueries {
  return {
    wallet: query({ amount: 100, currency: "GOLD" as const }),
    shopItems: query([]),
    shopPurchases: query([], [{ id: 41, shopItemId: 2, quantity: 1, status: "RESERVED", reservationToken: "canonical-shop-token", reservationExpiresAt: "2026-08-23T01:00:00Z" }]),
    openListings: query([]),
    myListings: query([]),
    inventory: query([]),
    trades: query([]),
  };
}

describe("Exchange command ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("00000000-0000-4000-8000-000000000068");
  });

  it("recovers a shop reservation from canonical purchase history and confirms its token", async () => {
    api.initiateShopPurchaseApi.mockResolvedValue({ id: 41 });
    api.confirmShopPurchaseApi.mockResolvedValue({ reservationToken: "canonical-shop-token", expiresAt: "2026-08-23T01:00:00Z" });
    const state = queries();
    const hook = renderHook(() => useExchangeMutations(state));
    let attempt: { purchaseId: number; purchase: ShopPurchaseSummary | null } | undefined;

    await act(async () => { attempt = await hook.result.current.startShopPurchase({ id: 2, itemId: 9, price: 30, currency: "GEM", available: true, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 60 }); });
    await act(async () => { await hook.result.current.confirmShopPurchase(attempt!.purchase!); });

    expect(api.initiateShopPurchaseApi).toHaveBeenCalledWith(expect.objectContaining({ shopItemId: 2, quantity: 1, reserveOnly: true }));
    expect(api.confirmShopPurchaseApi).toHaveBeenCalledWith("canonical-shop-token", expect.any(String));
    expect(state.shopPurchases.reload).toHaveBeenCalledTimes(2);
    expect(state.wallet.reload).toHaveBeenCalledTimes(2);
    expect(state.inventory.reload).toHaveBeenCalledTimes(2);
  });

  it("does not fabricate completion when canonical purchase history has not caught up", async () => {
    api.initiateShopPurchaseApi.mockResolvedValue({ id: 99 });
    const state = queries();
    vi.mocked(state.shopPurchases.reload).mockResolvedValue([]);
    const { result } = renderHook(() => useExchangeMutations(state));

    let attempt: { purchaseId: number; purchase: ShopPurchaseSummary | null } | undefined;
    await act(async () => { attempt = await result.current.startShopPurchase({ id: 2, itemId: 9, price: 30, currency: "GEM", available: true, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 60 }); });

    expect(attempt).toEqual({ purchaseId: 99, purchase: null });
    expect(result.current.error).toContain("canonical purchase history is not available");
    expect(api.confirmShopPurchaseApi).not.toHaveBeenCalled();

    vi.mocked(state.shopPurchases.reload).mockResolvedValue([{ id: 99, shopItemId: 2, quantity: 1, status: "RESERVED", reservationToken: "late-token", reservationExpiresAt: "2026-08-23T01:00:00Z" }]);
    await act(async () => { await result.current.refreshShopPurchase(99); });
    expect(api.initiateShopPurchaseApi).toHaveBeenCalledTimes(1);
  });

  it("maps the selected owned entry to the exact whole-entry listing command", async () => {
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

  it("reloads canonical surfaces after a reserved Marketplace purchase", async () => {
    api.reserveListingApi.mockResolvedValue({ reservationToken: "listing-token", holdId: "hold-8", expiresAt: "2026-08-23T01:00:00Z" });
    api.purchaseListingApi.mockResolvedValue({ id: 9, listingId: 8, buyerId: 7, sellerId: 4, price: 70, currency: "GOLD" });
    const state = queries();
    const { result } = renderHook(() => useExchangeMutations(state));
    const listing = { id: 8, itemId: 90, sellerId: 4, price: 70, currency: "GOLD" as const, status: "OPEN" };

    await act(async () => { await result.current.reserveListing(listing); });
    await act(async () => { await result.current.purchaseListing(listing, "listing-token"); });

    expect(api.reserveListingApi).toHaveBeenCalledWith(8, 300);
    expect(api.purchaseListingApi).toHaveBeenCalledWith(8, "listing-token", expect.any(String));
    expect(state.openListings.reload).toHaveBeenCalledTimes(1);
    expect(state.trades.reload).toHaveBeenCalledTimes(1);
    expect(state.wallet.reload).toHaveBeenCalledTimes(2);
    expect(state.inventory.reload).toHaveBeenCalledTimes(1);
  });
});
