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

const COMMAND_SLOTS: Record<string, { category: string; itemType: string }> = {
  HEAD: { category: "HEAD", itemType: "HELMET" },
  BODY: { category: "CHEST", itemType: "CHEST" },
};

export function composeEquipmentSlots(slots: EquipmentSlotInfo[], inventory: InventoryEntry[]): EquipmentSlotView[] {
  const items = new Map(inventory.map((item) => [item.itemInstanceId, item]));
  return slots.map((slot) => {
    const item = slot.itemInstanceId === null ? null : items.get(slot.itemInstanceId) ?? null;
    return { slot, item, enrichmentMissing: slot.itemInstanceId !== null && item === null };
  });
}

export function supportsEquipmentCommand(slot: EquipmentSlotInfo): boolean {
  const command = COMMAND_SLOTS[slot.slotCode];
  return Boolean(command && slot.slotCategory === command.category && slot.slotRole === "SINGLE");
}

export function candidatesForSlot(inventory: InventoryEntry[], slot: EquipmentSlotInfo): InventoryEntry[] {
  return inventory.filter((item) => getEquipCompatibility(slot, item).status === "VERIFIED" && item.itemInstanceId !== slot.itemInstanceId);
}

export function getEquipCompatibility(slot: EquipmentSlotInfo, item: InventoryEntry): EquipCompatibility {
  if (!supportsEquipmentCommand(slot)) return { status: "UNVERIFIABLE", reason: UNVERIFIABLE_REASON };
  const command = COMMAND_SLOTS[slot.slotCode];
  return item.category === "ARMOR" && item.type === command.itemType && !item.stackable && item.quantity === 1
    ? { status: "VERIFIED" }
    : { status: "INCOMPATIBLE", reason: INCOMPATIBLE_REASON };
}
