import type { MainNavId, PanelMenuItem, PanelItemAction } from "./types";

export const CRUD_ACTIONS: PanelItemAction[] = [
  { type: "edit",   label: "수정" },
  { type: "delete", label: "삭제" },
];

export const MAIN_NAV_ITEMS: Array<{ id: MainNavId; label: string; slotLabel: string }> = [
  { id: "player",    label: "Player",    slotLabel: "PL" },
  { id: "skills",    label: "Skills",    slotLabel: "SK" },
  { id: "inventory", label: "Inventory", slotLabel: "IN" },
  { id: "quests",    label: "Quests",    slotLabel: "QU" },
  { id: "role",      label: "Role",      slotLabel: "RL" },
  { id: "lifelog",   label: "Lifelog",   slotLabel: "LI" },
  { id: "market",    label: "Market",    slotLabel: "MK" },
  { id: "system",    label: "System",    slotLabel: "SY" },
];

export const MAIN_PANEL_TITLES: Record<MainNavId, string> = {
  player: "Player", skills: "Skills", inventory: "Inventory", quests: "Quests",
  role: "Role", social: "Social", lifelog: "Lifelog", market: "Market", system: "System",
};

export const SUBMENUS_BY_MAIN: Record<MainNavId, PanelMenuItem[]> = {
  player: [
    { id: "achievement", label: "Achievement", slotLabel: "AC" },
    { id: "credentials", label: "Credentials", slotLabel: "CR" },
    { id: "title",       label: "Title",       slotLabel: "TI" },
    { id: "interests",   label: "Interests",   slotLabel: "IN" },
  ],
  skills: [
    { id: "passive", label: "Passive", slotLabel: "PA" },
    { id: "active",  label: "Active",  slotLabel: "AV" },
  ],
  inventory: [
    { id: "items", label: "Items", slotLabel: "IT" },
    { id: "gear",  label: "Gear",  slotLabel: "GE" },
    { id: "inbox", label: "Inbox", slotLabel: "MB" },
  ],
  quests: [
    { id: "story",     label: "Story",     slotLabel: "ST" },
    { id: "suggested", label: "Suggested", slotLabel: "SG" },
    { id: "daily",     label: "Daily",     slotLabel: "DY" },
    { id: "party",     label: "Party",     slotLabel: "PT" },
    { id: "guild",     label: "Guild",     slotLabel: "GD" },
  ],
  role: [
    { id: "overview",  label: "Overview",  slotLabel: "OV" },
    { id: "relations", label: "Relations", slotLabel: "RE" },
    { id: "events",    label: "Events",    slotLabel: "EV" },
  ],
  social: [
    { id: "party",  label: "Party",  slotLabel: "PT" },
    { id: "guild",  label: "Guild",  slotLabel: "GD" },
    { id: "friend", label: "Friend", slotLabel: "FR" },
  ],
  lifelog: [
    { id: "collection", label: "Collection", slotLabel: "CL" },
    { id: "media",      label: "Media",      slotLabel: "MD" },
    { id: "exercise",   label: "Exercise",   slotLabel: "EX" },
  ],
  market: [
    { id: "wallet", label: "Wallet", slotLabel: "WL" },
    { id: "shop",   label: "Shop",   slotLabel: "SH" },
    { id: "trade",  label: "Trade",  slotLabel: "TR" },
  ],
  system: [
    { id: "options", label: "Options", slotLabel: "OP" },
    { id: "help",    label: "Help",    slotLabel: "HP" },
    { id: "logout",  label: "Logout",  slotLabel: "LO" },
  ],
};

export const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string | null> = {
  player: null, skills: null, inventory: null, quests: null,
  role: null, social: null, lifelog: null, market: null,  system: null,
};

export const INVENTORY_GEAR_PARTS: PanelMenuItem[] = [
  { id: "weapon",    label: "Weapon",    slotLabel: "WP" },
  { id: "armor",     label: "Armor",     slotLabel: "AR" },
  { id: "accessory", label: "Accessory", slotLabel: "AC" },
  { id: "boots",     label: "Boots",     slotLabel: "BT" },
];

export const MARKET_SHOP_SECTIONS: PanelMenuItem[] = [
  { id: "catalog",    label: "Catalog",     slotLabel: "CA" },
  { id: "myListings", label: "My Listings", slotLabel: "ML" },
];

export const MARKET_TRADE_WINDOW_ACTIONS: PanelMenuItem[] = [
  { id: "review",  label: "Review Offer",  slotLabel: "RV" },
  { id: "confirm", label: "Confirm Trade", slotLabel: "CF" },
];
