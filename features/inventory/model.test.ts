import { describe, expect, it } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { candidatesForGearPart, composeEquipmentSlots, getEquipCompatibility, slotsForGearPart } from "./model";

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

const slot = (slotCategory: string): EquipmentSlotInfo => ({ ...slots[0], slotCategory });
const item = (category: string, type: string, itemName = "Contract Item"): InventoryEntry => ({
  ...inventory[0], category, type, itemName,
});

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

  describe("선택한 slot과 item의 호환성을 판정하면", () => {
    it.each([
      ["WEAPON", "WEAPON", "SWORD"],
      ["HEAD", "ARMOR", "HELMET"],
      ["CHEST", "ARMOR", "CHEST"],
      ["RING", "ACCESSORY", "RING"],
    ])("%s slot의 현재 계약으로 증명되는 pair만 VERIFIED다", (slotCategory, category, type) => {
      expect(getEquipCompatibility(slot(slotCategory), item(category, type))).toEqual({ status: "VERIFIED" });
    });

    it.each([
      ["CHEST", "ARMOR", "HELMET"],
      ["HEAD", "ARMOR", "CHEST"],
    ])("%s slot에 다른 명시적 slot type은 INCOMPATIBLE이다", (slotCategory, category, type) => {
      expect(getEquipCompatibility(slot(slotCategory), item(category, type)).status).toBe("INCOMPATIBLE");
    });

    it.each([
      ["FEET", "ARMOR", "ETC"],
      ["LEGS", "ARMOR", "ETC"],
      ["HANDS", "ARMOR", "ETC"],
      ["NECK", "ACCESSORY", "ETC"],
      ["TRINKET", "ACCESSORY", "ETC"],
    ])("%s slot의 ETC item은 호환성을 추론하지 않는다", (slotCategory, category, type) => {
      expect(getEquipCompatibility(slot(slotCategory), item(category, type)).status).toBe("UNVERIFIABLE");
    });

    it("item name에 slot 단어가 있어도 호환성 증거로 사용하지 않는다", () => {
      expect(getEquipCompatibility(slot("HEAD"), item("ARMOR", "ETC", "Definitely Helmet"))).toMatchObject({ status: "UNVERIFIABLE" });
    });
  });
});
