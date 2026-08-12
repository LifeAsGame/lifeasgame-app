import { USE_MOCK, apiDelete, apiGet, apiPut } from "@/shared/api/client";
import type { EquipmentInfosResponse, EquipmentSlotInfo, EquippedResponse, UnequippedResponse } from "@/shared/api/types";
import { equipmentMock } from "../mock/equipment.mock";

export async function getEquippedGearApi(): Promise<EquipmentSlotInfo[]> {
  const res = USE_MOCK
    ? equipmentMock.infos()
    : await apiGet<EquipmentInfosResponse>("/api/v1/players/equipment");
  return res.infos;
}

export function equipGearApi(slotId: number, itemInstanceId: number): Promise<EquippedResponse> {
  return USE_MOCK
    ? Promise.resolve(equipmentMock.equip(slotId, itemInstanceId))
    : apiPut<EquippedResponse>(`/api/v1/players/equipment/${slotId}`, { itemInstanceId });
}

export function unequipGearApi(slotId: number): Promise<UnequippedResponse> {
  return USE_MOCK
    ? Promise.resolve(equipmentMock.unequip(slotId))
    : apiDelete<UnequippedResponse>(`/api/v1/players/equipment/${slotId}`);
}
