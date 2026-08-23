import { USE_MOCK, apiDelete, apiGet, apiPost } from "@/shared/api/client";
import type {
  ListingReservation,
  ListingSummary,
  ListingsResponse,
  OpenListingRequest,
  ShopItem,
  ShopPurchaseId,
  ShopPurchaseRequest,
  ShopPurchasesResponse,
  ShopPurchaseSummary,
  ShopReservation,
  TradeSummary,
  TradesResponse,
  WalletBalance,
} from "@/shared/api/types";
import { marketMock } from "../mock/market.mock";

export function getWalletApi(): Promise<WalletBalance> {
  return USE_MOCK ? Promise.resolve(marketMock.wallet()) : apiGet<WalletBalance>("/api/v1/economy/wallet");
}

export async function getShopItemsApi(): Promise<ShopItem[]> {
  const response = USE_MOCK
    ? marketMock.shopItems()
    : await apiGet<{ items: ShopItem[] }>("/api/v1/economy/shop/items");
  return response.items;
}

export async function getShopPurchasesApi(): Promise<ShopPurchaseSummary[]> {
  const response: ShopPurchasesResponse = USE_MOCK
    ? marketMock.shopPurchases()
    : await apiGet<ShopPurchasesResponse>("/api/v1/economy/shop/purchases");
  return response.purchases;
}

export function initiateShopPurchaseApi(request: ShopPurchaseRequest): Promise<ShopPurchaseId> {
  return USE_MOCK
    ? Promise.resolve(marketMock.initiateShopPurchase(request))
    : apiPost<ShopPurchaseId>("/api/v1/economy/shop/purchase", request);
}

export function confirmShopPurchaseApi(reservationToken: string, idempotencyKey: string): Promise<ShopReservation> {
  return USE_MOCK
    ? Promise.resolve(marketMock.confirmShopPurchase(reservationToken))
    : apiPost<ShopReservation>("/api/v1/economy/shop/reservations/confirm", { reservationToken, idempotencyKey });
}

export async function getMyListingsApi(): Promise<ListingSummary[]> {
  const response: ListingsResponse = USE_MOCK
    ? marketMock.myListings()
    : await apiGet<ListingsResponse>("/api/v1/economy/listings/me");
  return response.listings;
}

export async function getOpenListingsApi(): Promise<ListingSummary[]> {
  const response: ListingsResponse = USE_MOCK
    ? marketMock.openListings()
    : await apiGet<ListingsResponse>("/api/v1/economy/listings");
  return response.listings;
}

export function createListingApi(request: OpenListingRequest): Promise<{ id: number }> {
  return USE_MOCK
    ? Promise.resolve(marketMock.createListing(request))
    : apiPost<{ id: number }>("/api/v1/economy/listings", request);
}

export async function cancelListingApi(listingId: number): Promise<void> {
  if (USE_MOCK) return marketMock.cancelListing(listingId);
  await apiDelete<void>(`/api/v1/economy/listings/${listingId}`);
}

export function reserveListingApi(listingId: number, ttlSeconds: number): Promise<ListingReservation> {
  return USE_MOCK
    ? Promise.resolve(marketMock.reserveListing(listingId))
    : apiPost<ListingReservation>(`/api/v1/economy/listings/${listingId}/reserve`, { ttlSeconds });
}

export function purchaseListingApi(listingId: number, reservationToken: string, idempotencyKey: string): Promise<TradeSummary> {
  return USE_MOCK
    ? Promise.resolve(marketMock.purchaseListing(listingId, reservationToken))
    : apiPost<TradeSummary>(`/api/v1/economy/listings/${listingId}/purchase`, { reservationToken, idempotencyKey });
}

export async function getTradesApi(): Promise<TradeSummary[]> {
  const response: TradesResponse = USE_MOCK
    ? marketMock.trades()
    : await apiGet<TradesResponse>("/api/v1/economy/trades");
  return response.trades;
}
