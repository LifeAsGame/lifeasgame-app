import { USE_MOCK, apiGet } from "../client";
import {
  MOCK_GEAR_ACCESSORIES,
  MOCK_GEAR_ARMOR,
  MOCK_GEAR_BOOTS,
  MOCK_GEAR_WEAPONS,
  MOCK_INVENTORY_ITEMS,
  MOCK_INVENTORY_META,
  MOCK_MAIL_ITEMS,
  MOCK_MAIL_META,
} from "../mock/inventory.mock";
import type { InventoryEntry, InventoryMeta, MailEntry } from "../types";

export async function getInventoryApi(): Promise<{
  meta: InventoryMeta;
  entries: InventoryEntry[];
}> {
  if (USE_MOCK) return { meta: MOCK_INVENTORY_META, entries: MOCK_INVENTORY_ITEMS };
  return apiGet("/api/v1/inventory/me/view");
}

export async function getGearBySlotApi(
  slot: "weapon" | "armor" | "accessory" | "boots",
): Promise<InventoryEntry[]> {
  if (USE_MOCK) {
    const map = {
      weapon: MOCK_GEAR_WEAPONS,
      armor: MOCK_GEAR_ARMOR,
      accessory: MOCK_GEAR_ACCESSORIES,
      boots: MOCK_GEAR_BOOTS,
    };
    return map[slot];
  }
  const res = await apiGet<{ entries: InventoryEntry[] }>(
    `/api/v1/inventory/me/entries?category=${slot}`,
  );
  return res.entries;
}

export async function getMailboxApi(): Promise<{
  meta: InventoryMeta;
  entries: MailEntry[];
}> {
  if (USE_MOCK) return { meta: MOCK_MAIL_META, entries: MOCK_MAIL_ITEMS };
  return apiGet("/api/v1/mailbox/me/view");
}
