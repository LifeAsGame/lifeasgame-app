import { USE_MOCK, apiGet, apiPut, apiDelete } from "../client";
import { MOCK_INVENTORY_ITEMS } from "../mock/inventory.mock";
import type { EquipmentSlotInfo, EquippedResponse, UnequippedResponse } from "@/shared/api/types";

// Mock: Kirito의 장착 슬롯 (slotCode는 백엔드에서 정의)
const MOCK_EQUIPMENT_SLOTS: EquipmentSlotInfo[] = [
  {
    slotId: 1,
    slotCode: "MAIN_HAND",
    slotName: "주무기",
    slotCategory: "Weapon",
    slotRole: "DAMAGE",
    itemInstanceId: 1, // Elucidator
    itemName: "Elucidator",
    itemRarity: "Legendary",
    itemAttrs: { atk: 850, crit: 18 },
  },
  {
    slotId: 2,
    slotCode: "OFF_HAND",
    slotName: "보조무기",
    slotCategory: "Weapon",
    slotRole: "DAMAGE",
    itemInstanceId: 2, // Dark Repulser
    itemName: "Dark Repulser",
    itemRarity: "Legendary",
    itemAttrs: { atk: 820, magic: 120 },
  },
  {
    slotId: 3,
    slotCode: "CHEST",
    slotName: "상체",
    slotCategory: "Armor",
    slotRole: "DEFENSE",
    itemInstanceId: 3, // Black Coat of Midnight
    itemName: "Black Coat of Midnight",
    itemRarity: "Epic",
    itemAttrs: { def: 340, agi: 45 },
  },
  {
    slotId: 4,
    slotCode: "BOOTS",
    slotName: "신발",
    slotCategory: "Boots",
    slotRole: "MOBILITY",
    itemInstanceId: 4, // Windrunner Boots
    itemName: "Windrunner Boots",
    itemRarity: "Rare",
    itemAttrs: { def: 120, speed: 25 },
  },
  {
    slotId: 5,
    slotCode: "ACCESSORY_1",
    slotName: "악세서리 1",
    slotCategory: "Accessory",
    slotRole: "UTILITY",
    itemInstanceId: null,
    itemName: undefined,
    itemRarity: undefined,
    itemAttrs: undefined,
  },
  {
    slotId: 6,
    slotCode: "ACCESSORY_2",
    slotName: "악세서리 2",
    slotCategory: "Accessory",
    slotRole: "UTILITY",
    itemInstanceId: null,
    itemName: undefined,
    itemRarity: undefined,
    itemAttrs: undefined,
  },
];

// In-memory mock equip state (changes are not persisted)
let mockEquipState = [...MOCK_EQUIPMENT_SLOTS];

export async function getEquippedGearApi(): Promise<EquipmentSlotInfo[]> {
  if (USE_MOCK) return mockEquipState;
  const res = await apiGet<{ infos: EquipmentSlotInfo[] }>("/api/v1/players/equipment");
  return res.infos;
}

export async function equipGearApi(slotId: number, itemInstanceId: number): Promise<EquippedResponse> {
  if (USE_MOCK) {
    const item = MOCK_INVENTORY_ITEMS.find((i) => i.itemInstanceId === itemInstanceId);
    mockEquipState = mockEquipState.map((slot) =>
      slot.slotId === slotId
        ? {
            ...slot,
            itemInstanceId,
            itemName: item?.itemName,
            itemRarity: item?.rarity,
            itemAttrs: item?.instanceAttrs as Record<string, unknown>,
          }
        : slot,
    );
    return { slotId, itemInstanceId };
  }
  return apiPut<EquippedResponse>(`/api/v1/players/equipment/${slotId}`, { itemInstanceId });
}

export async function unequipGearApi(slotId: number): Promise<UnequippedResponse> {
  if (USE_MOCK) {
    mockEquipState = mockEquipState.map((slot) =>
      slot.slotId === slotId
        ? { ...slot, itemInstanceId: null, itemName: undefined, itemRarity: undefined, itemAttrs: undefined }
        : slot,
    );
    return { slotId };
  }
  return apiDelete<UnequippedResponse>(`/api/v1/players/equipment/${slotId}`);
}
