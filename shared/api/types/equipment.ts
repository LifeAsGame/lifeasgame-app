export interface EquipmentSlotInfo {
  slotId: number;
  slotCode: string;
  slotName: string;
  slotCategory: string;
  slotRole: string;
  itemInstanceId: number | null;
}

export interface EquipmentInfosResponse {
  infos: EquipmentSlotInfo[];
}

export interface EquippedResponse {
  slotId: number;
  itemInstanceId: number;
}

export interface UnequippedResponse {
  slotId: number;
}
