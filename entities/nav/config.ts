import type { MainNavId, PanelMenuItem, PanelDataItem, PanelItemAction } from "./types";

export const CRUD_ACTIONS: PanelItemAction[] = [
  { type: "edit", label: "수정" },
  { type: "delete", label: "삭제" },
];

export const MAIN_NAV_ITEMS: Array<{ id: MainNavId; label: string; slotLabel: string }> = [
  { id: "player", label: "Player", slotLabel: "PL" },
  { id: "skills", label: "Skills", slotLabel: "SK" },
  { id: "inventory", label: "Inventory", slotLabel: "IN" },
  { id: "quests", label: "Quests", slotLabel: "QU" },
  { id: "social", label: "Social", slotLabel: "SO" },
  { id: "lifelog", label: "Lifelog", slotLabel: "LI" },
  { id: "market", label: "Market", slotLabel: "MK" },
  { id: "system", label: "System", slotLabel: "SY" },
];

export const MAIN_PANEL_TITLES: Record<MainNavId, string> = {
  player: "Player",
  skills: "Skills",
  inventory: "Inventory",
  quests: "Quests",
  social: "Social",
  lifelog: "Lifelog",
  market: "Market",
  system: "System",
};

export const SUBMENUS_BY_MAIN: Record<MainNavId, PanelMenuItem[]> = {
  player: [
    { id: "achievement", label: "Achievement", slotLabel: "AC" },
    { id: "credentials", label: "Credentials", slotLabel: "CR" },
    { id: "title", label: "Title", slotLabel: "TI" },
    { id: "interests", label: "Interests", slotLabel: "IN" },
  ],
  skills: [
    { id: "passive", label: "Passive", slotLabel: "PA" },
    { id: "active", label: "Active", slotLabel: "AV" },
  ],
  inventory: [
    { id: "items", label: "Items", slotLabel: "IT" },
    { id: "gear", label: "Gear", slotLabel: "GE" },
    { id: "inbox", label: "Inbox", slotLabel: "MB" },
  ],
  quests: [
    { id: "story", label: "Story", slotLabel: "ST" },
    { id: "suggested", label: "Suggested", slotLabel: "SG" },
    { id: "daily", label: "Daily", slotLabel: "DY" },
    { id: "party", label: "Party", slotLabel: "PT" },
    { id: "guild", label: "Guild", slotLabel: "GD" },
  ],
  social: [
    { id: "party", label: "Party", slotLabel: "PT" },
    { id: "guild", label: "Guild", slotLabel: "GD" },
    { id: "friend", label: "Friend", slotLabel: "FR" },
  ],
  lifelog: [
    { id: "collection", label: "Collection", slotLabel: "CL" },
    { id: "media", label: "Media", slotLabel: "MD" },
    { id: "exercise", label: "Exercise", slotLabel: "EX" },
  ],
  market: [
    { id: "wallet", label: "Wallet", slotLabel: "WL" },
    { id: "shop", label: "Shop", slotLabel: "SH" },
    { id: "trade", label: "Trade", slotLabel: "TR" },
  ],
  system: [
    { id: "options", label: "Options", slotLabel: "OP" },
    { id: "help", label: "Help", slotLabel: "HP" },
    { id: "logout", label: "Logout", slotLabel: "LO" },
  ],
};

export const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string | null> = {
  player: null,
  skills: null,
  inventory: null,
  quests: null,
  social: null,
  lifelog: null,
  market: null,
  system: null,
};

export const INVENTORY_GEAR_PARTS: PanelMenuItem[] = [
  { id: "weapon", label: "Weapon", slotLabel: "WP" },
  { id: "armor", label: "Armor", slotLabel: "AR" },
  { id: "accessory", label: "Accessory", slotLabel: "AC" },
  { id: "boots", label: "Boots", slotLabel: "BT" },
];

export const MARKET_SHOP_SECTIONS: PanelMenuItem[] = [
  { id: "catalog", label: "Catalog", slotLabel: "CA" },
  { id: "myListings", label: "My Listings", slotLabel: "ML" },
];

export const MARKET_TRADE_WINDOW_ACTIONS: PanelMenuItem[] = [
  { id: "review", label: "Review Offer", slotLabel: "RV" },
  { id: "confirm", label: "Confirm Trade", slotLabel: "CF" },
];

// Shared helpers used by feature models
export function pad(value: number, width = 2) {
  return value.toString().padStart(width, "0");
}

export function dateAt(index: number) {
  const m = (index % 12) + 1;
  const d = ((index * 3) % 28) + 1;
  return `2026-${pad(m)}-${pad(d)}`;
}

type MockListConfig = {
  count: number;
  idPrefix: string;
  slotPrefix: string;
  label: (index: number) => string;
  subtitle: (index: number) => string;
  detailTitle: string;
  detailDescription: (index: number) => string;
  detailRows: (index: number) => string[];
  contextTitle?: (index: number) => string;
  contextDescription?: (index: number) => string;
  contextRows?: (index: number) => string[];
};

export function makeList(config: MockListConfig): PanelDataItem[] {
  return Array.from({ length: config.count }, (_, index) => ({
    id: `${config.idPrefix}-${pad(index + 1, 3)}`,
    label: config.label(index),
    slotLabel: `${config.slotPrefix}${(index % 9) + 1}`,
    subtitle: config.subtitle(index),
    detailTitle: config.detailTitle,
    detailDescription: config.detailDescription(index),
    detailRows: config.detailRows(index),
    contextTitle: config.contextTitle?.(index),
    contextDescription: config.contextDescription?.(index),
    contextRows: config.contextRows?.(index),
  }));
}

const RARITY = ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;

export function makeStandardRows(index: number, kind: string) {
  return [
    `Kind: ${kind}`,
    `Rarity: ${RARITY[index % RARITY.length]}`,
    `Level: ${(index % 70) + 8}`,
    `Updated: ${dateAt(index + 2)}`,
  ];
}

export function makeStandardList(kind: string, prefix: string, slot: string, count: number, detailTitle: string) {
  return makeList({
    count,
    idPrefix: prefix,
    slotPrefix: slot,
    label: (index) => `${kind} ${pad(index + 1, 3)}`,
    subtitle: (index) =>
      `Lv.${(index % 70) + 8} | ${RARITY[index % RARITY.length]} | ${dateAt(index)}`,
    detailTitle,
    detailDescription: (index) => `${kind} detail snapshot for sequence ${pad(index + 1, 3)}.`,
    detailRows: (index) => makeStandardRows(index, kind),
  });
}

export { RARITY };
