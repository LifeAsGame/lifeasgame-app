import type { ListingSummary, ShopItem, TradeSummary, WalletBalance } from "../types";

export const MOCK_WALLET: WalletBalance = {
  amount: 284500,
  currency: "col",
};

export const MOCK_SHOP_ITEMS: ShopItem[] = [
  { id: 1, itemId: 1010, price: 45000, currency: "col", available: true, globalStockLimit: null, perPlayerLimit: 1, reservationTtlSec: 300 },
  { id: 2, itemId: 1011, price: 28000, currency: "col", available: true, globalStockLimit: null, perPlayerLimit: 1, reservationTtlSec: 300 },
  { id: 3, itemId: 2010, price: 62000, currency: "col", available: true, globalStockLimit: null, perPlayerLimit: 1, reservationTtlSec: 300 },
  { id: 4, itemId: 3010, price: 2500, currency: "col", available: true, globalStockLimit: 1000, perPlayerLimit: 10, reservationTtlSec: 60 },
  { id: 5, itemId: 3011, price: 1800, currency: "col", available: true, globalStockLimit: 2000, perPlayerLimit: 20, reservationTtlSec: 60 },
  { id: 6, itemId: 4010, price: 8000, currency: "col", available: true, globalStockLimit: 200, perPlayerLimit: 3, reservationTtlSec: 120 },
  { id: 7, itemId: 5010, price: 4200, currency: "col", available: false, globalStockLimit: null, perPlayerLimit: null, reservationTtlSec: null },
  { id: 8, itemId: 5011, price: 18000, currency: "col", available: true, globalStockLimit: 50, perPlayerLimit: 5, reservationTtlSec: 180 },
  { id: 9, itemId: 6010, price: 6500, currency: "col", available: true, globalStockLimit: null, perPlayerLimit: 3, reservationTtlSec: 120 },
  { id: 10, itemId: 7010, price: 32000, currency: "col", available: true, globalStockLimit: null, perPlayerLimit: 1, reservationTtlSec: 300 },
  { id: 11, itemId: 1012, price: 15000, currency: "col", available: true, globalStockLimit: null, perPlayerLimit: 2, reservationTtlSec: 300 },
  { id: 12, itemId: 3012, price: 3200, currency: "col", available: true, globalStockLimit: 500, perPlayerLimit: 10, reservationTtlSec: 60 },
];

// Item name mapping for shop display
export const SHOP_ITEM_NAMES: Record<number, { name: string; category: string; rarity: string }> = {
  1010: { name: "Liberator Sword", category: "Weapon", rarity: "Epic" },
  1011: { name: "Night Sky Blade", category: "Weapon", rarity: "Rare" },
  2010: { name: "Crystalline Breastplate", category: "Armor", rarity: "Epic" },
  3010: { name: "HP Potion (L)", category: "Consumable", rarity: "Uncommon" },
  3011: { name: "MP Potion (M)", category: "Consumable", rarity: "Common" },
  4010: { name: "Floor Teleport Crystal", category: "Consumable", rarity: "Uncommon" },
  5010: { name: "Orichalcum Ore", category: "Material", rarity: "Legendary" },
  5011: { name: "Mithril Plate", category: "Material", rarity: "Rare" },
  6010: { name: "Enchantment Scroll (ATK)", category: "Scroll", rarity: "Uncommon" },
  7010: { name: "Shadow Cloak", category: "Armor", rarity: "Epic" },
  1012: { name: "Steel Broadsword", category: "Weapon", rarity: "Uncommon" },
  3012: { name: "Stamina Boost Potion", category: "Consumable", rarity: "Common" },
};

export const MOCK_MY_LISTINGS: ListingSummary[] = [
  { id: 101, itemId: 1003, sellerId: 6, price: 35000, currency: "col", status: "ACTIVE" },
  { id: 102, itemId: 5002, sellerId: 6, price: 8500, currency: "col", status: "ACTIVE" },
  { id: 103, itemId: 3001, sellerId: 6, price: 1200, currency: "col", status: "ACTIVE" },
  { id: 104, itemId: 7001, sellerId: 6, price: 12000, currency: "col", status: "RESERVED" },
  { id: 105, itemId: 5003, sellerId: 6, price: 55000, currency: "col", status: "ACTIVE" },
];

export const MOCK_TRADES: TradeSummary[] = [
  { id: 201, listingId: 88, buyerId: 6, sellerId: 24, price: 28000, currency: "col" },
  { id: 202, listingId: 56, buyerId: 6, sellerId: 37, price: 4500, currency: "col" },
  { id: 203, listingId: 91, buyerId: 13, sellerId: 6, price: 9000, currency: "col" },
  { id: 204, listingId: 72, buyerId: 6, sellerId: 51, price: 62000, currency: "col" },
  { id: 205, listingId: 103, buyerId: 7, sellerId: 6, price: 35000, currency: "col" },
  { id: 206, listingId: 44, buyerId: 6, sellerId: 18, price: 1800, currency: "col" },
  { id: 207, listingId: 118, buyerId: 6, sellerId: 63, price: 14500, currency: "col" },
];

// Partner name mapping for trades
export const TRADE_PARTNER_NAMES: Record<number, string> = {
  24: "Agil",
  37: "Argo",
  51: "Lisbeth",
  63: "Sachi",
  18: "Thinker",
  7: "Asuna",
  13: "Klein",
};
