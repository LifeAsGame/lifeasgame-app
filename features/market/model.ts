import type { PanelDataItem, FormFieldSpec } from "@/entities/nav";
import { makeList, pad, dateAt, RARITY } from "@/entities/nav";

export const LISTING_FORM_FIELDS: FormFieldSpec[] = [
  { key: "itemName", label: "Item Name", type: "text", placeholder: "e.g. Elucidator", required: true },
  { key: "price", label: "Price (col)", type: "number", placeholder: "10000", required: true },
  { key: "quantity", label: "Quantity", type: "number", placeholder: "1", required: true },
];

const STATUS = ["Open", "In Progress", "Completed", "On Hold"] as const;

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

export const MARKET_SHOP_CATALOG_LIST = makeList({
  count: 84,
  idPrefix: "market-catalog",
  slotPrefix: "CA",
  label: (index) => `Catalog Item ${pad(index + 1, 3)}`,
  subtitle: (index) => `${RARITY[index % RARITY.length]} | ${(index % 14000) + 400} col`,
  detailTitle: "Item Detail / Buy",
  detailDescription: (index) => `Catalog item detail ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Seller Score: ${(index % 98) + 2}`,
    `Stock: ${(index % 16) + 1}`,
    `Delivery ETA: ${(index % 12) + 1}h`,
    `Listed At: ${dateAt(index + 1)}`,
  ],
});

export const MARKET_SHOP_MY_LISTINGS = makeList({
  count: 42,
  idPrefix: "market-my-listing",
  slotPrefix: "ML",
  label: (index) => `My Listing ${pad(index + 1, 3)}`,
  subtitle: (index) => `Ask ${(index % 18000) + 1200} col | Watch ${(index % 80) + 1}`,
  detailTitle: "Listing Detail",
  detailDescription: (index) => `My listing detail ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Views: ${(index % 220) + 10}`,
    `Current Bid: ${(index % 16000) + 1000} col`,
    `Expire In: ${(index % 20) + 1} days`,
    `State: ${STATUS[index % STATUS.length]}`,
  ],
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
