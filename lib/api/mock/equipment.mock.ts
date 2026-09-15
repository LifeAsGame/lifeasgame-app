import type { EquipmentSlotInfo } from "@/shared/api/types";

const INITIAL_EQUIPMENT_SLOTS: EquipmentSlotInfo[] = [
  { slotId: 1, slotCode: "HEAD", slotName: "Head", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 2, slotCode: "NECK", slotName: "Neck", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 3, slotCode: "BODY", slotName: "Body", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 4, slotCode: "WRIST", slotName: "Wrist", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 5, slotCode: "RING_LEFT", slotName: "Ring", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 6, slotCode: "FEET", slotName: "Feet", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 7, slotCode: "AURA", slotName: "Aura", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 8, slotCode: "PROFILE_FRAME", slotName: "Profile Frame", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 9, slotCode: "BADGE", slotName: "Badge", slotCategory: null, slotRole: null, itemInstanceId: null },
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
