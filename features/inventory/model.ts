import type { InventoryGearPartId, PanelDataItem } from "@/entities/nav";
import { makeList, makeStandardList, pad, dateAt } from "@/entities/nav";

const STATUS = ["Open", "In Progress", "Completed", "On Hold"] as const;

export const INVENTORY_ITEMS_LIST = makeList({
  count: 72,
  idPrefix: "inventory-item",
  slotPrefix: "IT",
  label: (index) => `Item ${pad(index + 1, 3)}`,
  subtitle: (index) => `Qty ${(index % 15) + 1} | ${["Common", "Uncommon", "Rare", "Epic", "Legendary"][index % 5]} | ${dateAt(index)}`,
  detailTitle: "Item Detail",
  detailDescription: (index) => `Inventory item metadata for slot ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Type: Consumable`,
    `Price: ${(index % 14000) + 300} col`,
    `Weight: ${((index % 8) + 1) * 0.2}kg`,
    `State: ${STATUS[index % STATUS.length]}`,
  ],
});

export const INVENTORY_GEAR_LISTS: Record<InventoryGearPartId, PanelDataItem[]> = {
  weapon: makeStandardList("Weapon", "inventory-weapon", "WP", 50, "Weapon Detail"),
  armor: makeStandardList("Armor", "inventory-armor", "AR", 48, "Armor Detail"),
  accessory: makeStandardList("Accessory", "inventory-accessory", "AC", 44, "Accessory Detail"),
  boots: makeStandardList("Boots", "inventory-boots", "BT", 46, "Boots Detail"),
};

export const INVENTORY_INBOX_LIST = makeList({
  count: 52,
  idPrefix: "inventory-mail",
  slotPrefix: "ML",
  label: (index) => `Mail ${pad(index + 1, 3)}`,
  subtitle: (index) => `From Sender ${(index % 18) + 1} | ${STATUS[index % STATUS.length]}`,
  detailTitle: "Mail Detail",
  detailDescription: (index) => `Mail entry detail for message ${pad(index + 1, 3)}.`,
  detailRows: (index) => [
    `Received: ${dateAt(index)}`,
    `Attachment Slots: ${(index % 4) + 1}`,
    `Expiry: ${(index % 14) + 2} days`,
    `Priority: ${(index % 3) + 1}`,
  ],
});
