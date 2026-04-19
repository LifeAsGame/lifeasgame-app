export interface InventoryMeta {
  capacitySlots: number;
  usedSlots: number;
  freeSlots: number;
}

export interface InventoryEntry {
  itemInstanceId: number;
  slotIndex: number;
  itemId: number;
  itemName: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  bound: boolean;
  durability: number | null;
  instanceAttrs: Record<string, unknown>;
}

export interface InventoryView {
  meta: InventoryMeta;
  entries: InventoryEntry[];
}

export interface MailEntry {
  mailId: number;
  slotIndex: number;
  itemId: number;
  itemName: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  bound: boolean;
  durability: number | null;
  instanceAttrs: Record<string, unknown>;
}
