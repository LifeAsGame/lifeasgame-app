import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { marketMock } from "../mock/market.mock";
import {
  confirmShopPurchaseApi,
  createListingApi,
  getOpenListingsApi,
  getShopItemsApi,
  getShopPurchasesApi,
  getTradesApi,
  getWalletApi,
  initiateShopPurchaseApi,
  purchaseListingApi,
  reserveListingApi,
} from "./market.api";

const client = vi.hoisted(() => ({ apiDelete: vi.fn(), apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("canonical Economy API adapters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    marketMock.reset();
  });

  it("uses amount/currency wallet and canonical ShopItem wrappers without enrichment", async () => {
    client.apiGet
      .mockResolvedValueOnce({ amount: 900, currency: "GOLD" })
      .mockResolvedValueOnce({ items: [{ id: 1, itemId: 9, price: 30, currency: "GEM", available: false, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 60 }] });

    await expect(getWalletApi()).resolves.toEqual({ amount: 900, currency: "GOLD" });
    await expect(getShopItemsApi()).resolves.toEqual([
      { id: 1, itemId: 9, price: 30, currency: "GEM", available: false, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 60 },
    ]);
  });

  it("treats shop initiation as {id}, unwraps purchase history, and confirms its canonical token", async () => {
    client.apiPost.mockResolvedValueOnce({ id: 42 }).mockResolvedValueOnce({ reservationToken: "token-42", expiresAt: "2026-08-23T01:00:00Z" });
    client.apiGet.mockResolvedValue({ purchases: [{ id: 42, shopItemId: 3, quantity: 1, status: "RESERVED", reservationToken: "token-42", reservationExpiresAt: "2026-08-23T01:00:00Z" }] });
    const intent = { shopItemId: 3, quantity: 1, reserveOnly: true, idempotencyKey: "intent-shop-42" };

    await expect(initiateShopPurchaseApi(intent)).resolves.toEqual({ id: 42 });
    await expect(getShopPurchasesApi()).resolves.toEqual([expect.objectContaining({ id: 42, reservationToken: "token-42" })]);
    await expect(confirmShopPurchaseApi("token-42", "intent-confirm-42")).resolves.toEqual({ reservationToken: "token-42", expiresAt: "2026-08-23T01:00:00Z" });

    expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/economy/shop/purchase", intent);
    expect(client.apiPost).toHaveBeenNthCalledWith(2, "/api/v1/economy/shop/reservations/confirm", { reservationToken: "token-42", idempotencyKey: "intent-confirm-42" });
  });

  it("opens a whole-entry listing with exactly inventoryEntryId/price/currency", async () => {
    client.apiPost.mockResolvedValue({ id: 77 });

    await createListingApi({ inventoryEntryId: 501, price: 12_000, currency: "GOLD" });

    const body = client.apiPost.mock.calls[0][1];
    expect(client.apiPost).toHaveBeenCalledWith("/api/v1/economy/listings", { inventoryEntryId: 501, price: 12_000, currency: "GOLD" });
    expect(Object.keys(body)).toEqual(["inventoryEntryId", "price", "currency"]);
    expect(body).not.toHaveProperty("itemInstanceId");
    expect(body).not.toHaveProperty("itemId");
  });

  it("uses canonical listing reserve/purchase bodies and listing summary fields", async () => {
    client.apiGet.mockResolvedValue({ listings: [{ id: 8, itemId: 90, sellerId: 4, price: 70, currency: "GEM", status: "OPEN" }] });
    client.apiPost
      .mockResolvedValueOnce({ reservationToken: "listing-token", holdId: "hold-8", expiresAt: "2026-08-23T01:00:00Z" })
      .mockResolvedValueOnce({ id: 9, listingId: 8, buyerId: 7, sellerId: 4, price: 70, currency: "GEM" });

    await expect(getOpenListingsApi()).resolves.toEqual([{ id: 8, itemId: 90, sellerId: 4, price: 70, currency: "GEM", status: "OPEN" }]);
    await reserveListingApi(8, 300);
    await purchaseListingApi(8, "listing-token", "intent-listing-8");

    expect(client.apiPost).toHaveBeenNthCalledWith(1, "/api/v1/economy/listings/8/reserve", { ttlSeconds: 300 });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, "/api/v1/economy/listings/8/purchase", { reservationToken: "listing-token", idempotencyKey: "intent-listing-8" });
  });

  it("unwraps the canonical {trades} response without partner or barter enrichment", async () => {
    const trade = { id: 1, listingId: 2, buyerId: 7, sellerId: 8, price: 40, currency: "GOLD" };
    client.apiGet.mockResolvedValue({ trades: [trade] });

    await expect(getTradesApi()).resolves.toEqual([trade]);
  });

  it("keeps mock fixtures canonical and removes the legacy currency fallback", () => {
    const source = ["shared/api/types/economy.ts", "lib/api/endpoints/market.api.ts", "lib/api/mock/market.mock.ts"]
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");
    const fixtures = marketMock.shopItems().items;

    expect(new Set(fixtures.map(({ currency }) => currency))).toEqual(new Set(["GOLD", "GEM"]));
    expect(Object.keys(fixtures[0])).toEqual(["id", "itemId", "price", "currency", "available", "globalStockLimit", "perPlayerLimit", "reservationTtlSec"]);
    expect(source).not.toMatch(/["']col["']/i);
    expect(source).not.toContain("itemName");
  });
});
