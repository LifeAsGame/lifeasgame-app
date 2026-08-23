import type { EconomyCurrency, ShopPurchaseSummary, TradeSummary } from "@/shared/api/types";

export const EXCHANGE_CURRENCIES: EconomyCurrency[] = ["GOLD", "GEM"];
export type ExchangeShopSurface = "system-shop" | "marketplace" | "my-listings";

export function formatCurrency(amount: number, currency: EconomyCurrency) {
  return `${amount.toLocaleString()} ${currency}`;
}

export function itemIdentity(itemId: number) {
  return `Item #${itemId}`;
}

export function recoverShopPurchase(purchases: ShopPurchaseSummary[], purchaseId: number) {
  return purchases.find((purchase) => purchase.id === purchaseId) ?? null;
}

export function recoverLatestReservedShopPurchase(purchases: ShopPurchaseSummary[], shopItemId: number) {
  return purchases.reduce<ShopPurchaseSummary | null>((latest, purchase) => (
    purchase.shopItemId === shopItemId
    && purchase.status === "RESERVED"
    && purchase.reservationToken
    && (!latest || purchase.id > latest.id)
      ? purchase
      : latest
  ), null);
}

export function tradePresentation(trade: TradeSummary, playerId: number) {
  const bought = trade.buyerId === playerId;
  const counterpartyId = bought ? trade.sellerId : trade.buyerId;
  return { direction: bought ? "Bought" : "Sold", counterparty: `Player #${counterpartyId}` };
}
