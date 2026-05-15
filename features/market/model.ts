import type { PanelDataItem, FormFieldSpec } from "@/entities/nav";
import { makeList, pad, dateAt } from "@/entities/nav";
import { MOCK_SHOP_ITEMS, MOCK_MY_LISTINGS, SHOP_ITEM_NAMES } from "@/lib/api/mock/market.mock";

export const LISTING_FORM_FIELDS: FormFieldSpec[] = [
  { key: "itemName", label: "Item Name", type: "text", placeholder: "e.g. Elucidator", required: true },
  { key: "price", label: "Price (col)", type: "number", placeholder: "10000", required: true },
  { key: "quantity", label: "Quantity", type: "number", placeholder: "1", required: true },
];

export const MARKET_WALLET_SUMMARY_LIST = makeList({
  count: 36,
  idPrefix: "market-wallet",
  slotPrefix: "WL",
  label: (index) => `Wallet Summary ${pad(index + 1, 3)}`,
  subtitle: (index) => `Balance ${(index % 90000) + 20000} col | ${dateAt(index)}`,
  detailTitle: "Wallet Detail",
  detailDescription: (index) => `Wallet transaction detail ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Available: ${(index % 70000) + 12000} col`,
    `Pending: ${(index % 9000) + 800} col`,
    `Settlement: ${dateAt(index + 2)}`,
    `Risk: ${(index % 5) === 0 ? "Review" : "Clear"}`,
  ],
});

export const MARKET_SHOP_CATALOG_LIST: PanelDataItem[] = MOCK_SHOP_ITEMS.map((item) => {
  const info = SHOP_ITEM_NAMES[item.itemId] ?? { name: `Item #${item.itemId}`, category: "Misc", rarity: "Common" };
  return {
    id: String(item.id),
    label: info.name,
    slotLabel: info.rarity.slice(0, 2).toUpperCase(),
    subtitle: `${info.rarity} | ${item.price.toLocaleString()} col${item.available ? "" : " | 품절"}`,
    detailTitle: info.name,
    detailDescription: `${info.category} — ${info.rarity}`,
    detailRows: [
      `카테고리: ${info.category}`,
      `희귀도: ${info.rarity}`,
      `가격: ${item.price.toLocaleString()} col`,
      ...(item.globalStockLimit ? [`재고 한도: ${item.globalStockLimit}`] : []),
      ...(item.perPlayerLimit ? [`인당 구매 한도: ${item.perPlayerLimit}`] : []),
      `상태: ${item.available ? "구매 가능" : "품절"}`,
    ],
    actions: item.available ? [{ type: "start" as const, label: "구매" }] : [],
  };
});

const LISTING_ITEM_NAMES: Record<number, string> = {
  1003: "Pale Edge",
  5002: "Mithril Ingot",
  3001: "HP Potion (M)",
  7001: "Lucky Charm",
  5003: "Dragon Scale",
};

export const MARKET_SHOP_MY_LISTINGS: PanelDataItem[] = MOCK_MY_LISTINGS.map((listing) => {
  const itemName = LISTING_ITEM_NAMES[listing.itemId] ?? `Item #${listing.itemId}`;
  const statusLabel = listing.status === "ACTIVE" ? "판매 중" : listing.status === "RESERVED" ? "예약됨" : listing.status;
  return {
    id: String(listing.id),
    label: itemName,
    slotLabel: statusLabel.slice(0, 2),
    subtitle: `${listing.price.toLocaleString()} col | ${statusLabel}`,
    detailTitle: itemName,
    detailDescription: `마켓 리스팅 #${listing.id}`,
    detailRows: [
      `가격: ${listing.price.toLocaleString()} col`,
      `상태: ${statusLabel}`,
      `화폐: ${listing.currency}`,
    ],
    actions: listing.status === "ACTIVE"
      ? [{ type: "cancel" as const, label: "취소" }]
      : [],
  };
});

export const MARKET_TRADE_FRIENDS = makeList({
  count: 48,
  idPrefix: "market-trade-friend",
  slotPrefix: "TR",
  label: (index) => `Trade Partner ${pad(index + 1, 3)}`,
  subtitle: (index) =>
    `Lv.${(index % 68) + 8} | Trust ${(index % 100) + 1} | ${(index % 2) === 0 ? "Online" : "Away"}`,
  detailTitle: "Trade Window",
  detailDescription: (index) => `Trade session detail ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Allowed Slots: ${(index % 6) + 4}`,
    `Recent Trades: ${(index % 22) + 1}`,
    `Last Trade: ${dateAt(index + 1)}`,
    `Partner Fee: ${(index % 4) + 1}%`,
  ],
});

