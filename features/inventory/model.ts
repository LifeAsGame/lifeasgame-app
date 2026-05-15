import type { InventoryGearPartId, PanelDataItem } from "@/entities/nav";
import type { InventoryEntry, MailEntry } from "@/shared/api/types";
import type { EquipmentSlotInfo } from "@/shared/api/types";
import {
  MOCK_GEAR_ACCESSORIES,
  MOCK_GEAR_ARMOR,
  MOCK_GEAR_BOOTS,
  MOCK_GEAR_WEAPONS,
  MOCK_INVENTORY_ITEMS,
  MOCK_MAIL_ITEMS,
} from "@/lib/api/mock/inventory.mock";

const SLOT_CODES_BY_CATEGORY: Record<string, string[]> = {
  Weapon: ["MAIN_HAND", "OFF_HAND"],
  Armor: ["CHEST"],
  Boots: ["BOOTS"],
  Accessory: ["ACCESSORY_1", "ACCESSORY_2"],
};

export function getEquipSlotId(itemInstanceId: number, equippedGear: EquipmentSlotInfo[]): number {
  const item = MOCK_INVENTORY_ITEMS.find((i) => i.itemInstanceId === itemInstanceId);
  if (!item) return 1;
  const slotCodes = SLOT_CODES_BY_CATEGORY[item.category] ?? ["MAIN_HAND"];
  const emptySlot = equippedGear.find((s) => slotCodes.includes(s.slotCode) && s.itemInstanceId === null);
  if (emptySlot) return emptySlot.slotId;
  return equippedGear.find((s) => s.slotCode === slotCodes[0])?.slotId ?? 1;
}

function inventoryItemToPanel(item: InventoryEntry): PanelDataItem {
  const attrs = item.instanceAttrs as Record<string, number> ?? {};
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)
    .join(" / ");

  return {
    id: String(item.itemInstanceId),
    label: item.itemName,
    slotLabel: `x${item.quantity}`,
    subtitle: `${item.rarity} | ${item.category} | ${item.type}`,
    detailTitle: item.itemName,
    detailDescription: `${item.type} — ${item.category}`,
    detailRows: [
      `희귀도: ${item.rarity}`,
      `타입: ${item.type}`,
      `수량: ${item.quantity}`,
      ...(item.durability != null ? [`내구도: ${item.durability}`] : []),
      `귀속: ${item.bound ? "귀속됨" : "귀속 안됨"}`,
      ...(attrStr ? [`스탯: ${attrStr}`] : []),
    ],
    actions: item.bound ? [] : [{ type: "sell" as const, label: "판매" }],
  };
}

function gearItemToPanel(item: InventoryEntry, equippedSlots: EquipmentSlotInfo[]): PanelDataItem {
  const equippedIn = equippedSlots.find((s) => s.itemInstanceId === item.itemInstanceId);
  const attrs = item.instanceAttrs as Record<string, number> ?? {};
  const attrStr = Object.entries(attrs)
    .filter(([, v]) => typeof v === "number")
    .map(([k, v]) => `${k.toUpperCase()} +${v}`)
    .join(" / ");

  return {
    id: String(item.itemInstanceId),
    label: item.itemName,
    slotLabel: equippedIn ? equippedIn.slotName : "미장착",
    subtitle: `${item.rarity} | ${item.type}${equippedIn ? ` | ${equippedIn.slotName}` : ""}`,
    detailTitle: item.itemName,
    detailDescription: `${item.type} — ${item.category}`,
    detailRows: [
      `희귀도: ${item.rarity}`,
      `타입: ${item.type}`,
      `내구도: ${item.durability ?? "∞"}`,
      ...(attrStr ? [`스탯: ${attrStr}`] : []),
      equippedIn ? `장착 슬롯: ${equippedIn.slotName}` : "미장착",
    ],
    actions: equippedIn
      ? [{ type: "unequip", label: "장착 해제" }]
      : [{ type: "equip", label: "장착하기" }],
  };
}

function mailToPanel(mail: MailEntry): PanelDataItem {
  const from = String(mail.instanceAttrs?.from ?? "Unknown");
  const message = String(mail.instanceAttrs?.message ?? "");

  return {
    id: String(mail.mailId),
    label: mail.itemName,
    slotLabel: `x${mail.quantity}`,
    subtitle: `${from} | ${mail.rarity}`,
    detailTitle: mail.itemName,
    detailDescription: message,
    detailRows: [
      `발신자: ${from}`,
      `아이템: ${mail.itemName}`,
      `수량: ${mail.quantity}`,
      `희귀도: ${mail.rarity}`,
      ...(message ? [`메모: ${message}`] : []),
    ],
    actions: [
      { type: "claim", label: "수령" },
      { type: "delete", label: "삭제" },
    ],
  };
}

export const INVENTORY_ITEMS_LIST: PanelDataItem[] = MOCK_INVENTORY_ITEMS.map(inventoryItemToPanel);

export function makeGearLists(equippedSlots: EquipmentSlotInfo[]): Record<InventoryGearPartId, PanelDataItem[]> {
  return {
    weapon: MOCK_GEAR_WEAPONS.map((item) => gearItemToPanel(item, equippedSlots)),
    armor: MOCK_GEAR_ARMOR.map((item) => gearItemToPanel(item, equippedSlots)),
    accessory: MOCK_GEAR_ACCESSORIES.map((item) => gearItemToPanel(item, equippedSlots)),
    boots: MOCK_GEAR_BOOTS.map((item) => gearItemToPanel(item, equippedSlots)),
  };
}

export const INVENTORY_GEAR_LISTS: Record<InventoryGearPartId, PanelDataItem[]> = makeGearLists([]);

export const INVENTORY_INBOX_LIST: PanelDataItem[] = MOCK_MAIL_ITEMS.map(mailToPanel);
