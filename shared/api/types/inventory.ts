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

export interface InventoryEntriesResponse {
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

export interface MailboxEntriesResponse {
  entries: MailEntry[];
}

export interface MailboxClaimRequest {
  slotIndex: number;
  quantity: number;
}

export interface MailboxDeleteRequest {
  slotIndex: number;
  idempotencyKey?: string;
}
