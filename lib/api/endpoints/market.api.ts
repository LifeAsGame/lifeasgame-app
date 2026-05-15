import { USE_MOCK, apiGet, apiPost, apiDelete } from "../client";
import {
  MOCK_MY_LISTINGS,
  MOCK_SHOP_ITEMS,
  MOCK_TRADES,
  MOCK_WALLET,
  SHOP_ITEM_NAMES,
  TRADE_PARTNER_NAMES,
} from "../mock/market.mock";
import type { ListingSummary, ShopItem, TradeSummary, WalletBalance } from "../types";

export async function getWalletApi(): Promise<WalletBalance> {
  if (USE_MOCK) return MOCK_WALLET;
  return apiGet<WalletBalance>("/api/v1/economy/wallet");
}

export async function getShopItemsApi(): Promise<
  Array<ShopItem & { itemName: string; itemCategory: string; itemRarity: string }>
> {
  if (USE_MOCK) {
    return MOCK_SHOP_ITEMS.map((item) => {
      const info = SHOP_ITEM_NAMES[item.itemId] ?? {
        name: `Item #${item.itemId}`,
        category: "Misc",
        rarity: "Common",
      };
      return { ...item, itemName: info.name, itemCategory: info.category, itemRarity: info.rarity };
    });
  }
  const res = await apiGet<{ items: Array<ShopItem & { itemName: string; itemCategory: string; itemRarity: string }> }>("/api/v1/economy/shop/items");
  return res.items;
}

// Reserve → returns token + expiresAt
export async function reserveShopItemApi(shopItemId: number): Promise<{
  reservationToken: string;
  expiresAt: string;
}> {
  if (USE_MOCK) {
    return {
      reservationToken: `mock-token-${shopItemId}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }
  const res = await apiPost<{ reservationToken: string; expiresAt: string }>(
    "/api/v1/economy/shop/purchase",
    { shopItemId, quantity: 1, reserveOnly: true, idempotencyKey: `reserve-${shopItemId}-${Date.now()}` },
  );
  return res;
}

// Confirm purchase with reservation token
export async function confirmShopPurchaseApi(reservationToken: string): Promise<{ purchaseId: number }> {
  if (USE_MOCK) {
    return { purchaseId: Date.now() };
  }
  const res = await apiPost<{ id: number }>("/api/v1/economy/shop/reservations/confirm", {
    reservationToken,
    idempotencyKey: `confirm-${Date.now()}`,
  });
  return { purchaseId: res.id };
}

// Direct purchase (no reservation flow) — for items without stock limits
export async function purchaseShopItemApi(shopItemId: number): Promise<{ purchaseId: number }> {
  if (USE_MOCK) return { purchaseId: Date.now() };
  const res = await apiPost<{ id: number }>("/api/v1/economy/shop/purchase", {
    shopItemId,
    quantity: 1,
    reserveOnly: false,
    idempotencyKey: `buy-${shopItemId}-${Date.now()}`,
  });
  return { purchaseId: res.id };
}

export async function getMyListingsApi(): Promise<ListingSummary[]> {
  if (USE_MOCK) return MOCK_MY_LISTINGS;
  const res = await apiGet<{ listings: ListingSummary[] }>("/api/v1/economy/listings/me");
  return res.listings;
}

export async function getOpenListingsApi(): Promise<ListingSummary[]> {
  if (USE_MOCK) return MOCK_MY_LISTINGS;
  const res = await apiGet<{ listings: ListingSummary[] }>("/api/v1/economy/listings");
  return res.listings;
}

export async function createListingApi(data: {
  itemInstanceId: number;
  itemId: number;
  price: number;
  currency?: string;
}): Promise<{ listingId: number }> {
  if (USE_MOCK) {
    return { listingId: Date.now() };
  }
  const res = await apiPost<{ id: number }>("/api/v1/economy/listings", {
    itemInstanceId: data.itemInstanceId,
    itemId: data.itemId,
    price: data.price,
    currency: data.currency ?? "col",
  });
  return { listingId: res.id };
}

export async function cancelListingApi(listingId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/economy/listings/${listingId}`);
}

// Reserve a marketplace listing before purchase
export async function reserveListingApi(listingId: number): Promise<{
  reservationToken: string;
  holdId: string;
  expiresAt: string;
}> {
  if (USE_MOCK) {
    return {
      reservationToken: `mock-listing-token-${listingId}-${Date.now()}`,
      holdId: `hold-${Date.now()}`,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    };
  }
  return apiPost(`/api/v1/economy/listings/${listingId}/reserve`, { ttlSeconds: 300 });
}

// Purchase a reserved listing
export async function purchaseListingApi(listingId: number, reservationToken: string): Promise<{ tradeId: number }> {
  if (USE_MOCK) {
    return { tradeId: Date.now() };
  }
  const res = await apiPost<{ id: number }>(`/api/v1/economy/listings/${listingId}/purchase`, {
    reservationToken,
    idempotencyKey: `trade-${listingId}-${Date.now()}`,
  });
  return { tradeId: res.id };
}

export async function getTradesApi(): Promise<
  Array<TradeSummary & { partnerName: string; direction: "buy" | "sell" }>
> {
  if (USE_MOCK) {
    return MOCK_TRADES.map((t) => ({
      ...t,
      direction: t.buyerId === 6 ? "buy" : "sell",
      partnerName:
        t.buyerId === 6
          ? (TRADE_PARTNER_NAMES[t.sellerId] ?? `Player ${t.sellerId}`)
          : (TRADE_PARTNER_NAMES[t.buyerId] ?? `Player ${t.buyerId}`),
    }));
  }
  return apiGet("/api/v1/economy/trades");
}
