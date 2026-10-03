import type { EconomyCurrency, ShopPurchaseSummary, TradeSummary } from "@/shared/api/types";

export const EXCHANGE_CURRENCIES: EconomyCurrency[] = ["GOLD", "GEM"];
export type ExchangeShopSurface = "system-shop" | "marketplace" | "my-listings";

export function formatCurrency(amount: number, currency: EconomyCurrency) {
  return `${amount.toLocaleString()} ${currency}`;
}

export function itemIdentity(itemId: number | null) {
  return itemId === null ? "상품 정보 미확인" : `Item #${itemId}`;
}

export function recoverShopPurchase(purchases: ShopPurchaseSummary[], purchaseId: number) {
  return purchases.find((purchase) => purchase.id === purchaseId) ?? null;
}

export function recoverLatestPendingShopPurchase(purchases: ShopPurchaseSummary[], shopItemId: number) {
  return purchases.reduce<ShopPurchaseSummary | null>((latest, purchase) => (
    purchase.shopItemId === shopItemId
    && (purchase.status === "REQUESTED" || purchase.status === "RESERVED")
    && (!latest || purchase.id > latest.id)
      ? purchase
      : latest
  ), null);
}

export function tradePresentation(trade: TradeSummary, playerId: number) {
  const bought = trade.buyerId === playerId;
  const counterpartyId = bought ? trade.sellerId : trade.buyerId;
  return { direction: bought ? "구매" : "판매", counterparty: `플레이어 #${counterpartyId}` };
}

export function listingQuantity(quantity: number | null | undefined) {
  return quantity === undefined ? "수량 미확인 · 서버 필드 미제공"
    : quantity === null ? "수량 미확인 · 과거 기록 없음" : `수량 ${quantity}`;
}
