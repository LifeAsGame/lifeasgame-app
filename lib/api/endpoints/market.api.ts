import { USE_MOCK, apiGet, apiPost } from "../client";
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
  return apiGet<WalletBalance>("/api/v1/economy/me/wallet");
}

export async function getShopItemsApi(): Promise<
  Array<ShopItem & { itemName: string; itemCategory: string; itemRarity: string }>
> {
  if (USE_MOCK) {
    return MOCK_SHOP_ITEMS.map((item) => {
      const info = SHOP_ITEM_NAMES[item.itemId] ?? { name: `Item #${item.itemId}`, category: "Misc", rarity: "Common" };
      return { ...item, itemName: info.name, itemCategory: info.category, itemRarity: info.rarity };
    });
  }
  return apiGet("/api/v1/economy/shop/items");
}

export async function purchaseShopItemApi(shopItemId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/economy/shop/items/${shopItemId}/purchase`, {});
}

export async function getMyListingsApi(): Promise<ListingSummary[]> {
  if (USE_MOCK) return MOCK_MY_LISTINGS;
  const res = await apiGet<{ listings: ListingSummary[] }>("/api/v1/economy/me/listings");
  return res.listings;
}

export async function createListingApi(data: {
  itemInstanceId: number;
  price: number;
}): Promise<ListingSummary> {
  if (USE_MOCK) {
    return { id: Date.now(), itemId: data.itemInstanceId, sellerId: 6, price: data.price, currency: "col", status: "ACTIVE" };
  }
  return apiPost<ListingSummary>("/api/v1/economy/listings", data);
}

export async function cancelListingApi(listingId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/economy/listings/${listingId}/cancel`, {});
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
  return apiGet("/api/v1/economy/me/trades");
}
