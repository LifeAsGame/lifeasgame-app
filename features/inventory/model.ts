import type { InventoryGearPartId } from "@/entities/nav";
import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";

export type EquipmentSlotView = {
  slot: EquipmentSlotInfo;
  item: InventoryEntry | null;
  enrichmentMissing: boolean;
};

const SLOT_CATEGORIES: Record<InventoryGearPartId, readonly string[]> = {
  weapon: ["WEAPON"],
  armor: ["HEAD", "CHEST", "LEGS", "HANDS"],
  accessory: ["NECK", "RING", "TRINKET"],
  boots: ["FEET"],
};

const ITEM_CATEGORY: Record<InventoryGearPartId, string> = {
  weapon: "WEAPON",
  armor: "ARMOR",
  accessory: "ACCESSORY",
  boots: "ARMOR",
};

export function composeEquipmentSlots(slots: EquipmentSlotInfo[], inventory: InventoryEntry[]): EquipmentSlotView[] {
  const items = new Map(inventory.map((item) => [item.itemInstanceId, item]));
  return slots.map((slot) => {
    const item = slot.itemInstanceId === null ? null : items.get(slot.itemInstanceId) ?? null;
    return { slot, item, enrichmentMissing: slot.itemInstanceId !== null && item === null };
  });
}

export function slotsForGearPart(slots: EquipmentSlotView[], part: InventoryGearPartId): EquipmentSlotView[] {
  return slots.filter(({ slot }) => SLOT_CATEGORIES[part].includes(slot.slotCategory));
}

export function candidatesForGearPart(inventory: InventoryEntry[], part: InventoryGearPartId): InventoryEntry[] {
  return inventory.filter(({ category }) => category === ITEM_CATEGORY[part]);
}
