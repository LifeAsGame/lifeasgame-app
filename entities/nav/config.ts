import type { MainNavId, PanelMenuItem, PanelItemAction } from "./types";

export const CRUD_ACTIONS: PanelItemAction[] = [
  { type: "edit",   label: "수정" },
  { type: "delete", label: "삭제" },
];

export const MAIN_NAV_ITEMS: Array<{ id: MainNavId; label: string; slotLabel: string }> = [
  { id: "player",    label: "Player",    slotLabel: "PL" },
  { id: "inventory", label: "Inventory", slotLabel: "IN" },
  { id: "quests",    label: "Journey",   slotLabel: "QU" },
  { id: "role",      label: "Role",      slotLabel: "RL" },
  { id: "lifelog",   label: "Lifelog",   slotLabel: "LI" },
  { id: "market",    label: "Exchange",  slotLabel: "EX" },
  { id: "system",    label: "System",    slotLabel: "SY" },
];

export const MAIN_PANEL_TITLES: Record<MainNavId, string> = {
  player: "Player", inventory: "Inventory", quests: "Journey", role: "Role",
  lifelog: "Lifelog", market: "Exchange", system: "System",
};

export const SUBMENUS_BY_MAIN: Record<MainNavId, PanelMenuItem[]> = {
  player: [
    { id: "growth",      label: "Growth",      slotLabel: "GR" },
    { id: "achievement", label: "Achievement", slotLabel: "AC" },
    { id: "credentials", label: "Credentials", slotLabel: "CR" },
    { id: "title",       label: "Title",       slotLabel: "TI" },
    { id: "interests",   label: "Interests",   slotLabel: "IN" },
  ],
  inventory: [
    { id: "items", label: "Items", slotLabel: "IT" },
    { id: "gear",  label: "Gear",  slotLabel: "GE" },
    { id: "inbox", label: "Inbox", slotLabel: "MB" },
  ],
  quests: [
    { id: "current", label: "Current", slotLabel: "CU" },
    { id: "catalog", label: "Catalog", slotLabel: "CA" },
    { id: "routes",  label: "Routes",  slotLabel: "RT" },
  ],
  role: [
    { id: "overview",  label: "Overview",  slotLabel: "OV" },
    { id: "relations", label: "Relations", slotLabel: "RE" },
    { id: "events",    label: "Events",    slotLabel: "EV" },
  ],
  lifelog: [
    { id: "journal",    label: "Journal",    slotLabel: "JR" },
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
    { id: "logout",  label: "Logout",  slotLabel: "LO" },
  ],
};

export const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string | null> = {
  player: null, inventory: null, quests: null, role: null,
  lifelog: null, market: null, system: null,
};

export const INVENTORY_GEAR_PARTS: PanelMenuItem[] = [
  { id: "weapon",    label: "Weapon",    slotLabel: "WP" },
  { id: "armor",     label: "Armor",     slotLabel: "AR" },
  { id: "accessory", label: "Accessory", slotLabel: "AC" },
  { id: "boots",     label: "Boots",     slotLabel: "BT" },
];
