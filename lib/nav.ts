export type MainNavId =
  | "player"
  | "skills"
  | "inventory"
  | "quests"
  | "social"
  | "lifelog"
  | "market"
  | "system";

export type PlayerSubId = "achievement" | "credentials" | "title" | "interests";
export type SkillsSubId = "passive" | "active";
export type InventorySubId = "items" | "gear" | "inbox";
export type InventoryGearPartId = "weapon" | "armor" | "accessory" | "boots";
export type QuestsSubId = "story" | "suggested" | "daily" | "party" | "guild";
export type SocialSubId = "party" | "guild" | "friend";
export type LifelogSubId = "collection" | "media" | "exercise";
export type MarketSubId = "wallet" | "shop" | "trade";
export type MarketShopSubId = "catalog" | "myListings";
export type SystemSubId = "options" | "help" | "logout";

export type PanelMenuItem = {
  id: string;
  label: string;
  slotLabel: string;
  description?: string;
};

export type PanelDataItem = {
  id: string;
  label: string;
  slotLabel: string;
  subtitle?: string;
  detailTitle?: string;
  detailDescription: string;
  detailRows: string[];
  contextTitle?: string;
  contextDescription?: string;
  contextRows?: string[];
};

export type SocialContextData = {
  categoryLabel: string;
  title: string;
  subtitle?: string;
  description: string;
  rows: string[];
};

type PanelContext = {
  main: MainNavId;
  route: string;
};

export type PanelStackItem =
  | {
      id: string;
      kind: "menu";
      title: string;
      items: PanelMenuItem[];
      selectedId?: string;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "list";
      title: string;
      items: PanelDataItem[];
      selectedId?: string;
      actionLabel?: string;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "placeholder";
      title: string;
      description: string;
      rows?: string[];
      primaryActionLabel?: string;
    }
  | {
      id: string;
      kind: "modal";
      title: string;
      description: string;
      rows?: string[];
      confirmLabel: string;
    };

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

export const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string> = {
  player: "achievement",
  skills: "passive",
  inventory: "items",
  quests: "story",
  social: "party",
  lifelog: "collection",
  market: "wallet",
  system: "options",
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

const RARITY = ["Common", "Uncommon", "Rare", "Epic", "Legendary"] as const;
const STATUS = ["Open", "In Progress", "Completed", "On Hold"] as const;

function pad(value: number, width = 2) {
  return value.toString().padStart(width, "0");
}

function dateAt(index: number) {
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

function makeList(config: MockListConfig): PanelDataItem[] {
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

function makeStandardRows(index: number, kind: string) {
  return [
    `Kind: ${kind}`,
    `Rarity: ${RARITY[index % RARITY.length]}`,
    `Level: ${(index % 70) + 8}`,
    `Updated: ${dateAt(index + 2)}`,
  ];
}

function makeStandardList(kind: string, prefix: string, slot: string, count: number, detailTitle: string) {
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

export const PLAYER_LISTS: Record<PlayerSubId, PanelDataItem[]> = {
  achievement: makeStandardList("Achievement", "player-achievement", "AC", 48, "Achievement Detail"),
  credentials: makeStandardList("Credential", "player-credential", "CR", 44, "Credential Detail"),
  title: makeStandardList("Title", "player-title", "TI", 42, "Title Detail"),
  interests: makeStandardList("Interest", "player-interest", "IN", 46, "Interest Detail"),
};

export const SKILLS_LISTS: Record<SkillsSubId, PanelDataItem[]> = {
  passive: makeStandardList("Passive Skill", "skill-passive", "PS", 40, "Passive Detail"),
  active: makeStandardList("Active Skill", "skill-active", "AS", 42, "Active Detail"),
};

export const INVENTORY_ITEMS_LIST = makeList({
  count: 72,
  idPrefix: "inventory-item",
  slotPrefix: "IT",
  label: (index) => `Item ${pad(index + 1, 3)}`,
  subtitle: (index) => `Qty ${(index % 15) + 1} | ${RARITY[index % RARITY.length]} | ${dateAt(index)}`,
  detailTitle: "Item Detail",
  detailDescription: (index) => `Inventory item metadata for slot ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Type: Consumable`,
    `Price: ${(index % 14000) + 300} col`,
    `Weight: ${((index % 8) + 1) * 0.2}kg`,
    `State: ${STATUS[index % STATUS.length]}`,
  ],
});

export const INVENTORY_GEAR_LISTS: Record<InventoryGearPartId, PanelDataItem[]> = {
  weapon: makeStandardList("Weapon", "inventory-weapon", "WP", 50, "Weapon Detail"),
  armor: makeStandardList("Armor", "inventory-armor", "AR", 48, "Armor Detail"),
  accessory: makeStandardList("Accessory", "inventory-accessory", "AC", 44, "Accessory Detail"),
  boots: makeStandardList("Boots", "inventory-boots", "BT", 46, "Boots Detail"),
};

export const INVENTORY_INBOX_LIST = makeList({
  count: 52,
  idPrefix: "inventory-mail",
  slotPrefix: "ML",
  label: (index) => `Mail ${pad(index + 1, 3)}`,
  subtitle: (index) => `From Sender ${(index % 18) + 1} | ${STATUS[index % STATUS.length]}`,
  detailTitle: "Mail Detail",
  detailDescription: (index) => `Mail entry detail for message ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Received: ${dateAt(index)}`,
    `Attachment Slots: ${(index % 4) + 1}`,
    `Expiry: ${(index % 14) + 2} days`,
    `Priority: ${(index % 3) + 1}`,
  ],
});

export const QUEST_LISTS: Record<QuestsSubId, PanelDataItem[]> = {
  story: makeStandardList("Story Quest", "quest-story", "ST", 44, "Quest Detail"),
  suggested: makeStandardList("Suggested Quest", "quest-suggested", "SG", 40, "Quest Detail"),
  daily: makeStandardList("Daily Quest", "quest-daily", "DY", 38, "Quest Detail"),
  party: makeStandardList("Party Quest", "quest-party", "PT", 36, "Quest Detail"),
  guild: makeStandardList("Guild Quest", "quest-guild", "GD", 34, "Quest Detail"),
};

export const SOCIAL_LISTS: Record<SocialSubId, PanelDataItem[]> = {
  party: makeList({
    count: 42,
    idPrefix: "social-party",
    slotPrefix: "PT",
    label: (index) => `Party ${pad(index + 1, 3)}`,
    subtitle: (index) => `${(index % 6) + 2}/6 members | Avg Lv ${(index % 50) + 10}`,
    detailTitle: "Party Detail",
    detailDescription: (index) => `Party detail profile ${pad(index + 1, 3)}.`,
    detailRows: (index) => makeStandardRows(index, "Party"),
    contextTitle: (index) => `Party Context ${pad(index + 1, 3)}`,
    contextDescription: () =>
      "Party detail is rendered in left context. Right detail panel is intentionally disabled.",
    contextRows: (index) => [
      `Recruitment: ${(index % 2) === 0 ? "Open" : "Closed"}`,
      `Leader: Player ${(index % 90) + 10}`,
      `Region: Zone ${(index % 8) + 1}`,
      `Last Activity: ${dateAt(index + 1)}`,
    ],
  }),
  guild: makeList({
    count: 38,
    idPrefix: "social-guild",
    slotPrefix: "GD",
    label: (index) => `Guild ${pad(index + 1, 3)}`,
    subtitle: (index) => `${(index % 120) + 20} members | Rank ${(index % 40) + 1}`,
    detailTitle: "Guild Detail",
    detailDescription: (index) => `Guild detail profile ${pad(index + 1, 3)}.`,
    detailRows: (index) => makeStandardRows(index, "Guild"),
    contextTitle: (index) => `Guild Context ${pad(index + 1, 3)}`,
    contextDescription: () =>
      "Guild detail is rendered in left context. Right detail panel is intentionally disabled.",
    contextRows: (index) => [
      `Join Rule: ${(index % 2) === 0 ? "Application" : "Invite Only"}`,
      `Treasury: ${(index % 9000) + 12000} col`,
      `Contribution Req: ${80 + index} / week`,
      `Last Event: ${dateAt(index + 2)}`,
    ],
  }),
  friend: makeList({
    count: 52,
    idPrefix: "social-friend",
    slotPrefix: "FR",
    label: (index) => `Friend ${pad(index + 1, 3)}`,
    subtitle: (index) => `Lv.${(index % 70) + 8} | ${(index % 2) === 0 ? "Online" : "Away"}`,
    detailTitle: "Friend Detail",
    detailDescription: (index) => `Friend profile ${pad(index + 1, 3)}.`,
    detailRows: (index) => makeStandardRows(index, "Friend"),
    contextTitle: (index) => `Friend Context ${pad(index + 1, 3)}`,
    contextDescription: () => "Friend profile and record are rendered in left context.",
    contextRows: (index) => [
      `Affinity: ${(index % 100) + 1}`,
      `Shared Runs: ${(index % 26) + 2}`,
      `Last Seen: ${dateAt(index + 1)}`,
      `Memo Tag: ${(index % 6) + 1}`,
    ],
  }),
};

export const LIFELOG_LISTS: Record<LifelogSubId, PanelDataItem[]> = {
  collection: makeStandardList("Collection", "lifelog-collection", "CL", 42, "Collection Detail"),
  media: makeStandardList("Media", "lifelog-media", "MD", 40, "Media Detail"),
  exercise: makeStandardList("Exercise", "lifelog-exercise", "EX", 41, "Exercise Detail"),
};

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

export const SYSTEM_PANEL_ROWS: Record<Exclude<SystemSubId, "logout">, {
  description: string;
  rows: string[];
}> = {
  options: {
    description: "System options panel for graphics, controls, and gameplay settings.",
    rows: [
      "Graphics: High",
      "Master Volume: 78%",
      "Voice Chat: Team Only",
      "UI Scale: 100%",
      "Input Preset: Standard",
    ],
  },
  help: {
    description: "Help panel for quick guides, FAQ, and support routes.",
    rows: [
      "Quick Start Guide",
      "Frequently Asked Questions",
      "Contact Support",
      "Patch Notes",
      "Terms and Safety",
    ],
  },
};
