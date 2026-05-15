export interface EquipmentSlotInfo {
  slotId: number;
  slotCode: string;
  slotName: string;
  slotCategory: string;
  slotRole: string;
  itemInstanceId: number | null;
  itemName?: string;
  itemRarity?: string;
  itemAttrs?: Record<string, unknown>;
}

export interface EquippedResponse {
  slotId: number;
  itemInstanceId: number;
}

export interface UnequippedResponse {
  slotId: number;
}
