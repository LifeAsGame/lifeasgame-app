import { describe, expect, it } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { candidatesForSlot, composeEquipmentSlots, getEquipCompatibility, supportsEquipmentCommand } from "./model";

const slot: EquipmentSlotInfo = {
  slotId: 21, slotCode: "HEAD", slotName: "Head", slotCategory: "HEAD", slotRole: "SINGLE", itemInstanceId: null,
};
const item: InventoryEntry = {
  itemInstanceId: 501, slotIndex: 3, itemId: 101, itemName: "기록자의 모자", category: "ARMOR", type: "HELMET",
  rarity: "RARE", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: null, instanceAttrs: {},
};

describe("server equipment slots", () => {
  it("keeps server slot IDs and instance IDs distinct when inventory enrichment is missing", () => {
    expect(composeEquipmentSlots([{ ...slot, itemInstanceId: 999 }], [])).toEqual([
      { slot: { ...slot, itemInstanceId: 999 }, item: null, enrichmentMissing: true },
    ]);
    expect(composeEquipmentSlots([{ ...slot, itemInstanceId: 501 }], [item])[0].item).toEqual(item);
  });

  it("enables commands only for mapped HEAD and BODY fields", () => {
    expect(supportsEquipmentCommand(slot)).toBe(true);
    expect(supportsEquipmentCommand({ ...slot, slotCode: "BODY", slotCategory: "CHEST" })).toBe(true);
    expect(supportsEquipmentCommand({ ...slot, slotCategory: null })).toBe(false);
    expect(supportsEquipmentCommand({ ...slot, slotCode: "RING_LEFT", slotCategory: "RING" })).toBe(false);
  });

  it("offers only compatible owned instances and excludes the already equipped instance", () => {
    const chest = { ...item, itemInstanceId: 601, type: "CHEST" };
    expect(candidatesForSlot([item, chest], slot)).toEqual([item]);
    expect(candidatesForSlot([item, chest], { ...slot, itemInstanceId: 501 })).toEqual([]);
    expect(getEquipCompatibility(slot, chest).status).toBe("INCOMPATIBLE");
    expect(getEquipCompatibility({ ...slot, slotRole: null }, item).status).toBe("UNVERIFIABLE");
  });
});
