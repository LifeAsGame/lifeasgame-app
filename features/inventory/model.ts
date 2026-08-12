import type { InventoryGearPartId } from "@/entities/nav";
import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";

export type EquipmentSlotView = {
  slot: EquipmentSlotInfo;
  item: InventoryEntry | null;
  enrichmentMissing: boolean;
};

export type EquipCompatibility =
  | { status: "VERIFIED" }
  | { status: "INCOMPATIBLE"; reason: string }
  | { status: "UNVERIFIABLE"; reason: string };

const INCOMPATIBLE_REASON = "This item is incompatible with the selected Equipment slot.";
const UNVERIFIABLE_REASON = "Compatibility is not available for this slot in the current item contract.";

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

export function getEquipCompatibility(slot: EquipmentSlotInfo, item: InventoryEntry): EquipCompatibility {
  if (slot.slotCategory === "WEAPON") {
    return item.category === "WEAPON" ? { status: "VERIFIED" } : { status: "INCOMPATIBLE", reason: INCOMPATIBLE_REASON };
  }

  const expectedCategory = ["HEAD", "CHEST", "LEGS", "HANDS", "FEET"].includes(slot.slotCategory)
    ? "ARMOR"
    : ["NECK", "RING", "TRINKET"].includes(slot.slotCategory) ? "ACCESSORY" : null;
  if (!expectedCategory) return { status: "UNVERIFIABLE", reason: UNVERIFIABLE_REASON };
  if (item.category !== expectedCategory) return { status: "INCOMPATIBLE", reason: INCOMPATIBLE_REASON };

  const verifiedType = slot.slotCategory === "HEAD" ? "HELMET"
    : slot.slotCategory === "CHEST" ? "CHEST"
      : slot.slotCategory === "RING" ? "RING" : null;
  if (!verifiedType) {
    const knownOtherSlotType = ["HELMET", "CHEST", "RING"].includes(item.type);
    return knownOtherSlotType
      ? { status: "INCOMPATIBLE", reason: INCOMPATIBLE_REASON }
      : { status: "UNVERIFIABLE", reason: UNVERIFIABLE_REASON };
  }
  if (item.type === verifiedType) return { status: "VERIFIED" };
  return item.type === "ETC"
    ? { status: "UNVERIFIABLE", reason: UNVERIFIABLE_REASON }
    : { status: "INCOMPATIBLE", reason: INCOMPATIBLE_REASON };
}
