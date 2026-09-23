import { apiGet } from "./client";

export interface ItemDetail {
  id: number;
  code: string;
  name: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  maxDurability: number | null;
  baseAttrs: Record<string, number>;
  description: string | null;
}

export function getItemApi(itemId: number): Promise<ItemDetail> {
  return apiGet<ItemDetail>(`/api/v1/items/${itemId}`);
}
