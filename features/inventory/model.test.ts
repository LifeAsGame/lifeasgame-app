import { describe, expect, it } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { candidatesForGearPart, composeEquipmentSlots, slotsForGearPart } from "./model";

const slots: EquipmentSlotInfo[] = [
  { slotId: 21, slotCode: "MAIN_HAND", slotName: "Main Hand", slotCategory: "WEAPON", slotRole: "MAIN", itemInstanceId: 501 },
  { slotId: 22, slotCode: "OFF_HAND", slotName: "Off Hand", slotCategory: "WEAPON", slotRole: "OFFHAND", itemInstanceId: null },
  { slotId: 31, slotCode: "CHEST", slotName: "Chest", slotCategory: "CHEST", slotRole: "SINGLE", itemInstanceId: 999 },
  { slotId: 41, slotCode: "FEET", slotName: "Feet", slotCategory: "FEET", slotRole: "SINGLE", itemInstanceId: null },
];

const inventory: InventoryEntry[] = [
  { itemInstanceId: 501, slotIndex: 3, itemId: 101, itemName: "Server Sword", category: "WEAPON", type: "SWORD", rarity: "RARE", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 88, instanceAttrs: { atk: 12 } },
  { itemInstanceId: 601, slotIndex: 4, itemId: 201, itemName: "Server Armor", category: "ARMOR", type: "CHEST", rarity: "EPIC", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 77, instanceAttrs: { def: 20 } },
  { itemInstanceId: 701, slotIndex: 5, itemId: 301, itemName: "Server Ring", category: "ACCESSORY", type: "RING", rarity: "COMMON", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: null, instanceAttrs: {} },
];

describe("Equipment와 Inventory를 Gear read model로 조합할 때", () => {
  describe("slot의 itemInstanceId가 Inventory와 일치하면", () => {
    it("slot identity를 유지하고 실제 Inventory display fields로 enrich한다", () => {
      const composed = composeEquipmentSlots(slots, inventory);

      expect(composed[0]).toEqual({ slot: slots[0], item: inventory[0], enrichmentMissing: false });
      expect(composed[1]).toEqual({ slot: slots[1], item: null, enrichmentMissing: false });
    });
  });

  describe("occupied slot의 Inventory enrichment가 없으면", () => {
    it("empty로 바꾸지 않고 slot과 itemInstanceId를 보존한다", () => {
      const composed = composeEquipmentSlots(slots, inventory);

      expect(composed[2]).toEqual({ slot: slots[2], item: null, enrichmentMissing: true });
      expect(composed[2].slot.itemInstanceId).toBe(999);
    });
  });

  describe("Gear subsection을 선택하면", () => {
    it("검증된 slot category mapping과 coarse Inventory category mapping만 적용한다", () => {
      const composed = composeEquipmentSlots(slots, inventory);

      expect(slotsForGearPart(composed, "weapon").map(({ slot }) => slot.slotId)).toEqual([21, 22]);
      expect(slotsForGearPart(composed, "armor").map(({ slot }) => slot.slotId)).toEqual([31]);
      expect(slotsForGearPart(composed, "boots").map(({ slot }) => slot.slotId)).toEqual([41]);
      expect(candidatesForGearPart(inventory, "weapon").map(({ itemInstanceId }) => itemInstanceId)).toEqual([501]);
      expect(candidatesForGearPart(inventory, "armor").map(({ itemInstanceId }) => itemInstanceId)).toEqual([601]);
      expect(candidatesForGearPart(inventory, "boots").map(({ itemInstanceId }) => itemInstanceId)).toEqual([601]);
      expect(candidatesForGearPart(inventory, "accessory").map(({ itemInstanceId }) => itemInstanceId)).toEqual([701]);
    });
  });
});
