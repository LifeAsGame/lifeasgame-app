import { describe, expect, it } from "vitest";

import type { EquipmentSlotInfo, InventoryEntry } from "@/shared/api/types";
import { candidatesForGearPart, composeEquipmentSlots, getEquipCompatibility, slotsForGearPart } from "./model";

const slots: EquipmentSlotInfo[] = [
  { slotId: 21, slotCode: "HEAD", slotName: "Head", slotCategory: null, slotRole: null, itemInstanceId: 501 },
  { slotId: 22, slotCode: "NECK", slotName: "Neck", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 23, slotCode: "BODY", slotName: "Body", slotCategory: null, slotRole: null, itemInstanceId: 999 },
  { slotId: 24, slotCode: "WRIST", slotName: "Wrist", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 25, slotCode: "RING_LEFT", slotName: "Ring", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 26, slotCode: "FEET", slotName: "Feet", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 27, slotCode: "AURA", slotName: "Aura", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 28, slotCode: "PROFILE_FRAME", slotName: "Profile Frame", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 29, slotCode: "BADGE", slotName: "Badge", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 30, slotCode: "TITLE", slotName: "Title", slotCategory: null, slotRole: null, itemInstanceId: null },
  { slotId: 31, slotCode: "CHEST", slotName: "Legacy Chest", slotCategory: "CHEST", slotRole: "SINGLE", itemInstanceId: null },
];

const inventory: InventoryEntry[] = [
  { itemInstanceId: 501, slotIndex: 3, itemId: 101, itemName: "Server Sword", category: "WEAPON", type: "SWORD", rarity: "RARE", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 88, instanceAttrs: { atk: 12 } },
  { itemInstanceId: 601, slotIndex: 4, itemId: 201, itemName: "Server Armor", category: "ARMOR", type: "CHEST", rarity: "EPIC", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 77, instanceAttrs: { def: 20 } },
  { itemInstanceId: 701, slotIndex: 5, itemId: 301, itemName: "Server Ring", category: "ACCESSORY", type: "RING", rarity: "COMMON", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: null, instanceAttrs: {} },
];

const slot = (slotCode: string): EquipmentSlotInfo => ({ ...slots[0], slotCode });
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
    it("nine eager slotCode만 현재 Gear parts에 배치하고 TITLE과 inactive legacy slot은 제외한다", () => {
      const composed = composeEquipmentSlots(slots, inventory);

      expect(slotsForGearPart(composed, "weapon")).toEqual([]);
      expect(slotsForGearPart(composed, "armor").map(({ slot }) => slot.slotCode)).toEqual(["HEAD", "BODY", "WRIST"]);
      expect(slotsForGearPart(composed, "accessory").map(({ slot }) => slot.slotCode)).toEqual(["NECK", "RING_LEFT", "AURA", "PROFILE_FRAME", "BADGE"]);
      expect(slotsForGearPart(composed, "boots").map(({ slot }) => slot.slotCode)).toEqual(["FEET"]);
      expect(["weapon", "armor", "accessory", "boots"].flatMap((part) =>
        slotsForGearPart(composed, part as "weapon" | "armor" | "accessory" | "boots").map(({ slot }) => slot.slotCode),
      ).sort()).toEqual(["AURA", "BADGE", "BODY", "FEET", "HEAD", "NECK", "PROFILE_FRAME", "RING_LEFT", "WRIST"]);
      expect(candidatesForGearPart(inventory, "weapon").map(({ itemInstanceId }) => itemInstanceId)).toEqual([501]);
      expect(candidatesForGearPart(inventory, "armor").map(({ itemInstanceId }) => itemInstanceId)).toEqual([601]);
      expect(candidatesForGearPart(inventory, "boots").map(({ itemInstanceId }) => itemInstanceId)).toEqual([601]);
      expect(candidatesForGearPart(inventory, "accessory").map(({ itemInstanceId }) => itemInstanceId)).toEqual([701]);
    });
  });

  describe("선택한 slot과 item의 호환성을 판정하면", () => {
    it.each([
      ["HEAD", "ARMOR", "HELMET"],
      ["BODY", "ARMOR", "CHEST"],
      ["RING_LEFT", "ACCESSORY", "RING"],
    ])("%s slotCode의 현재 계약으로 증명되는 pair만 VERIFIED다", (slotCode, category, type) => {
      expect(getEquipCompatibility(slot(slotCode), item(category, type))).toEqual({ status: "VERIFIED" });
    });

    it.each([
      ["BODY", "ARMOR", "HELMET"],
      ["HEAD", "ARMOR", "CHEST"],
    ])("%s slot에 다른 명시적 slot type은 INCOMPATIBLE이다", (slotCode, category, type) => {
      expect(getEquipCompatibility(slot(slotCode), item(category, type)).status).toBe("INCOMPATIBLE");
    });

    it.each([
      ["FEET", "ARMOR", "ETC"],
      ["WRIST", "ARMOR", "ETC"],
      ["NECK", "ACCESSORY", "ETC"],
      ["AURA", "ACCESSORY", "ETC"],
      ["PROFILE_FRAME", "ACCESSORY", "ETC"],
      ["BADGE", "ACCESSORY", "ETC"],
      ["TITLE", "ACCESSORY", "ETC"],
    ])("%s slot의 item 호환성은 추론하지 않는다", (slotCode, category, type) => {
      expect(getEquipCompatibility(slot(slotCode), item(category, type)).status).toBe("UNVERIFIABLE");
    });

    it("item name에 slot 단어가 있어도 호환성 증거로 사용하지 않는다", () => {
      expect(getEquipCompatibility(slot("HEAD"), item("ARMOR", "ETC", "Definitely Helmet"))).toMatchObject({ status: "UNVERIFIABLE" });
    });
  });
});
