export type EconomyCurrency = "GOLD" | "GEM";

export interface WalletBalance {
  amount: number;
  currency: EconomyCurrency;
}

export interface OpenListingRequest {
  inventoryEntryId: number;
  price: number;
  currency: EconomyCurrency;
}

export interface ListingSummary {
  id: number;
  itemId: number;
  sellerId: number;
  price: number;
  currency: EconomyCurrency;
  status: string;
}

export interface ShopItem {
  id: number;
  itemId: number;
  price: number;
  currency: EconomyCurrency;
  available: boolean;
  globalStockLimit: number | null;
  perPlayerLimit: number | null;
  reservationTtlSec: number | null;
}

export interface TradeSummary {
  id: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  price: number;
  currency: EconomyCurrency;
}

export interface ListingsResponse {
  listings: ListingSummary[];
}

export interface TradesResponse {
  trades: TradeSummary[];
}

export interface ShopPurchaseRequest {
  shopItemId: number;
  quantity: number;
  reserveOnly: boolean;
  idempotencyKey: string;
}

export interface ShopPurchaseId {
  id: number;
}

export interface ShopPurchaseSummary {
  id: number;
  shopItemId: number;
  quantity: number;
  status: string;
  reservationToken: string | null;
  reservationExpiresAt: string | null;
}

export interface ShopPurchasesResponse {
  purchases: ShopPurchaseSummary[];
}

export interface ShopReservation {
  reservationToken: string;
  expiresAt: string;
}

export interface ListingReservation {
  reservationToken: string;
  holdId: string;
  expiresAt: string;
}
