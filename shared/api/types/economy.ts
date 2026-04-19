export interface WalletBalance {
  amount: number;
  currency: string;
}

export interface ListingSummary {
  id: number;
  itemId: number;
  sellerId: number;
  price: number;
  currency: string;
  status: string;
}

export interface ShopItem {
  id: number;
  itemId: number;
  price: number;
  currency: string;
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
  currency: string;
}
