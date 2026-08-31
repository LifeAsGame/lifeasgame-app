import { ApiError, apiGet } from "@/shared/api/client";

import { requirePositiveAdminPlayerId } from "./player.query";
import { resolveAdminDataSourceMode } from "./source";
import type { AdminDataSourceDescriptor } from "./source";

export type AdminItemSearchQuery = {
  name?: string;
  category?: string;
  type?: string;
  rarity?: string;
  page?: number;
  size?: number;
};

export type AdminItemSummary = {
  id: number;
  code: string;
  name: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
};

export type AdminItemDetail = AdminItemSummary & {
  maxDurability: number | null;
  baseAttrs: Record<string, number>;
};

export type AdminItemPage = {
  content: AdminItemSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type AdminInventoryEntry = {
  itemInstanceId: number;
  slotIndex: number;
  itemId: number;
  itemName: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  bound: boolean;
  durability: number | null;
};

export type AdminMailboxEntry = {
  mailId: number;
  slotIndex: number;
  itemId: number;
  itemName: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  bound: boolean;
  durability: number | null;
};

export type AdminInventoryEntries = { playerId: number; entries: AdminInventoryEntry[] };
export type AdminMailboxEntries = { playerId: number; entries: AdminMailboxEntry[] };

export type AdminInventoryOperationsDataSource = {
  descriptor: AdminDataSourceDescriptor & { inventoryLabel: string };
  searchItems: (query: AdminItemSearchQuery) => Promise<AdminItemPage>;
  getItem: (itemId: number) => Promise<AdminItemDetail>;
  getInventory: (playerId: number) => Promise<AdminInventoryEntries>;
  getMailbox: (playerId: number) => Promise<AdminMailboxEntries>;
};

const ITEMS_PATH = "/admin/v1/items";
const PLAYERS_PATH = "/admin/v1/players";
const ITEM_CATEGORIES = ["WEAPON", "ARMOR", "ACCESSORY", "CONSUMABLE", "MATERIAL", "QUEST", "MISC"] as const;
const ITEM_TYPES = ["SWORD", "BOW", "STAFF", "SHIELD", "HELMET", "CHEST", "RING", "POTION", "SCROLL", "ORE", "HERB", "KEY", "ETC"] as const;
const ITEM_RARITIES = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"] as const;

function positiveId(value: number, field: string) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${field} must be a positive integer.`);
  return value;
}

function optionalText(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizedSearch(query: AdminItemSearchQuery) {
  const page = query.page === undefined ? 0 : query.page;
  const size = query.size === undefined ? 20 : query.size;
  if (!Number.isInteger(page) || page < 0) throw new RangeError("page must be a non-negative integer.");
  if (!Number.isInteger(size) || size < 1 || size > 100) throw new RangeError("size must be an integer from 1 to 100.");
  return {
    name: optionalText(query.name),
    category: optionalText(query.category),
    type: optionalText(query.type),
    rarity: optionalText(query.rarity),
    page,
    size,
  };
}

export async function searchAdminItems(query: AdminItemSearchQuery = {}): Promise<AdminItemPage> {
  const normalized = normalizedSearch(query);
  const params = new URLSearchParams();
  if (normalized.name) params.set("name", normalized.name);
  if (normalized.category) params.set("category", normalized.category);
  if (normalized.type) params.set("type", normalized.type);
  if (normalized.rarity) params.set("rarity", normalized.rarity);
  params.set("page", String(normalized.page));
  params.set("size", String(normalized.size));
  return apiGet<AdminItemPage>(`${ITEMS_PATH}?${params}`);
}

export async function getAdminItem(itemId: number): Promise<AdminItemDetail> {
  const expected = positiveId(itemId, "itemId");
  const item = await apiGet<AdminItemDetail>(`${ITEMS_PATH}/${expected}`);
  if (item.id !== expected) throw new Error("Item detail response did not match the requested Item ID.");
  return item;
}

export async function getAdminPlayerInventory(playerId: number): Promise<AdminInventoryEntries> {
  const expected = requirePositiveAdminPlayerId(playerId, "playerId");
  const inventory = await apiGet<AdminInventoryEntries>(`${PLAYERS_PATH}/${expected}/inventory`);
  if (inventory.playerId !== expected) throw new Error("Inventory response did not match the requested Player ID.");
  return inventory;
}

export async function getAdminPlayerMailbox(playerId: number): Promise<AdminMailboxEntries> {
  const expected = requirePositiveAdminPlayerId(playerId, "playerId");
  const mailbox = await apiGet<AdminMailboxEntries>(`${PLAYERS_PATH}/${expected}/mailbox`);
  if (mailbox.playerId !== expected) throw new Error("Mailbox response did not match the requested Player ID.");
  return mailbox;
}

const MOCK_ITEMS: AdminItemDetail[] = [
  { id: 1201, code: "HEALTH_POTION", name: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, maxDurability: null, baseAttrs: {} },
  { id: 2204, code: "IRON_LONGSWORD", name: "Iron Longsword", category: "WEAPON", type: "SWORD", rarity: "UNCOMMON", stackable: false, maxStack: 1, maxDurability: 100, baseAttrs: { attack: 12 } },
  { id: 3307, code: "TRAVEL_CHARM", name: "Travel Charm", category: "ACCESSORY", type: "ETC", rarity: "RARE", stackable: true, maxStack: 20, maxDurability: null, baseAttrs: {} },
];

function mockSummary(item: AdminItemDetail): AdminItemSummary {
  return {
    id: item.id,
    code: item.code,
    name: item.name,
    category: item.category,
    type: item.type,
    rarity: item.rarity,
    stackable: item.stackable,
    maxStack: item.maxStack,
  };
}

async function searchMockItems(query: AdminItemSearchQuery = {}): Promise<AdminItemPage> {
  const normalized = normalizedSearch(query);
  const strictEnum = (value: string | undefined, allowed: readonly string[], label: string) => {
    if (!value) return undefined;
    const parsed = value.trim().replace(/[- ]/g, "_").toUpperCase();
    if (!allowed.includes(parsed)) throw new RangeError(`Invalid Item ${label}: ${value}`);
    return parsed;
  };
  const category = strictEnum(normalized.category, ITEM_CATEGORIES, "category");
  const type = strictEnum(normalized.type, ITEM_TYPES, "type");
  const rarity = strictEnum(normalized.rarity, ITEM_RARITIES, "rarity");
  const name = normalized.name?.toLocaleLowerCase();
  const filtered = MOCK_ITEMS.filter((item) => (!name || item.name.toLocaleLowerCase().includes(name))
    && (!category || item.category === category)
    && (!type || item.type === type)
    && (!rarity || item.rarity === rarity));
  const start = normalized.page * normalized.size;
  return {
    content: filtered.slice(start, start + normalized.size).map(mockSummary),
    page: normalized.page,
    size: normalized.size,
    totalElements: filtered.length,
    totalPages: Math.ceil(filtered.length / normalized.size),
  };
}

async function getMockItem(itemId: number): Promise<AdminItemDetail> {
  positiveId(itemId, "itemId");
  const item = MOCK_ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) throw new ApiError(404, "ITEM_NOT_FOUND", "Item was not found.");
  return { ...item, baseAttrs: { ...item.baseAttrs } };
}

async function getMockInventory(playerId: number): Promise<AdminInventoryEntries> {
  requirePositiveAdminPlayerId(playerId, "playerId");
  if (playerId !== 10218) throw new ApiError(404, "PLAYER_NOT_FOUND", "Player was not found.");
  return { playerId, entries: [{ itemInstanceId: 71001, slotIndex: 0, itemId: 1201, itemName: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, quantity: 12, bound: false, durability: null }] };
}

async function getMockMailbox(playerId: number): Promise<AdminMailboxEntries> {
  requirePositiveAdminPlayerId(playerId, "playerId");
  if (playerId !== 10218) throw new ApiError(404, "PLAYER_NOT_FOUND", "Player was not found.");
  return { playerId, entries: [{ mailId: 81001, slotIndex: 0, itemId: 3307, itemName: "Travel Charm", category: "ACCESSORY", type: "ETC", rarity: "RARE", stackable: true, maxStack: 20, quantity: 1, bound: true, durability: null }] };
}

const API_SOURCE: AdminInventoryOperationsDataSource = {
  descriptor: { mode: "api", badge: "API", label: "/admin/v1", inventoryLabel: "/admin/v1/items · /admin/v1/players/{playerId}" },
  searchItems: searchAdminItems,
  getItem: getAdminItem,
  getInventory: getAdminPlayerInventory,
  getMailbox: getAdminPlayerMailbox,
};

const MOCK_SOURCE: AdminInventoryOperationsDataSource = {
  descriptor: { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", inventoryLabel: "Local Admin Mock" },
  searchItems: searchMockItems,
  getItem: getMockItem,
  getInventory: getMockInventory,
  getMailbox: getMockMailbox,
};

export function getAdminInventoryOperationsDataSource(value: unknown): AdminInventoryOperationsDataSource {
  return resolveAdminDataSourceMode(value) === "mock" ? MOCK_SOURCE : API_SOURCE;
}

export const adminInventoryOperationsDataSource = getAdminInventoryOperationsDataSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
