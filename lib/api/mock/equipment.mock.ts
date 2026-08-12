import type { EquipmentSlotInfo } from "@/shared/api/types";

const INITIAL_EQUIPMENT_SLOTS: EquipmentSlotInfo[] = [
  { slotId: 1, slotCode: "MAIN_HAND", slotName: "Main Hand", slotCategory: "WEAPON", slotRole: "MAIN", itemInstanceId: 1 },
  { slotId: 2, slotCode: "OFF_HAND", slotName: "Off Hand", slotCategory: "WEAPON", slotRole: "OFFHAND", itemInstanceId: 2 },
  { slotId: 3, slotCode: "HEAD", slotName: "Head", slotCategory: "HEAD", slotRole: "SINGLE", itemInstanceId: 14 },
  { slotId: 4, slotCode: "CHEST", slotName: "Chest", slotCategory: "CHEST", slotRole: "SINGLE", itemInstanceId: 3 },
  { slotId: 5, slotCode: "HANDS", slotName: "Hands", slotCategory: "HANDS", slotRole: "SINGLE", itemInstanceId: 13 },
  { slotId: 6, slotCode: "LEGS", slotName: "Legs", slotCategory: "LEGS", slotRole: "SINGLE", itemInstanceId: null },
  { slotId: 7, slotCode: "FEET", slotName: "Feet", slotCategory: "FEET", slotRole: "SINGLE", itemInstanceId: 4 },
  { slotId: 8, slotCode: "NECK", slotName: "Neck", slotCategory: "NECK", slotRole: "SINGLE", itemInstanceId: null },
  { slotId: 9, slotCode: "RING_LEFT", slotName: "Left Ring", slotCategory: "RING", slotRole: "LEFT", itemInstanceId: 18 },
  { slotId: 10, slotCode: "RING_RIGHT", slotName: "Right Ring", slotCategory: "RING", slotRole: "RIGHT", itemInstanceId: null },
  { slotId: 11, slotCode: "TRINKET", slotName: "Trinket", slotCategory: "TRINKET", slotRole: "SINGLE", itemInstanceId: null },
];

const copy = <T,>(value: T): T => structuredClone(value);
let slots = copy(INITIAL_EQUIPMENT_SLOTS);

export const equipmentMock = {
  infos: () => ({ infos: copy(slots) }),
  equip: (slotId: number, itemInstanceId: number) => {
    if (!slots.some((slot) => slot.slotId === slotId)) throw new Error("Equipment slot not found.");
    slots = slots.map((slot) => slot.slotId === slotId ? { ...slot, itemInstanceId } : slot);
    return { slotId, itemInstanceId };
  },
  unequip: (slotId: number) => {
    if (!slots.some((slot) => slot.slotId === slotId)) throw new Error("Equipment slot not found.");
    slots = slots.map((slot) => slot.slotId === slotId ? { ...slot, itemInstanceId: null } : slot);
    return { slotId };
  },
  reset: () => { slots = copy(INITIAL_EQUIPMENT_SLOTS); },
};
