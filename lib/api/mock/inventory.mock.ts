import type { InventoryEntry, InventoryMeta, MailEntry } from "../types";

export const MOCK_INVENTORY_META: InventoryMeta = {
  capacitySlots: 120,
  usedSlots: 68,
  freeSlots: 52,
};

export const MOCK_INVENTORY_ITEMS: InventoryEntry[] = [
  { itemInstanceId: 1, slotIndex: 0, itemId: 1001, itemName: "Elucidator", category: "Weapon", type: "Sword", rarity: "Legendary", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 98, instanceAttrs: { atk: 850, crit: 18 } },
  { itemInstanceId: 2, slotIndex: 1, itemId: 1002, itemName: "Dark Repulser", category: "Weapon", type: "Sword", rarity: "Legendary", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 95, instanceAttrs: { atk: 820, magic: 120 } },
  { itemInstanceId: 3, slotIndex: 2, itemId: 2001, itemName: "Black Coat of Midnight", category: "Armor", type: "Coat", rarity: "Epic", stackable: false, maxStack: 1, quantity: 1, bound: true, durability: 88, instanceAttrs: { def: 340, agi: 45 } },
  { itemInstanceId: 4, slotIndex: 3, itemId: 2002, itemName: "Windrunner Boots", category: "Boots", type: "Boots", rarity: "Rare", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: 72, instanceAttrs: { def: 120, speed: 25 } },
  { itemInstanceId: 5, slotIndex: 4, itemId: 3001, itemName: "HP Potion (M)", category: "Consumable", type: "Potion", rarity: "Common", stackable: true, maxStack: 99, quantity: 42, bound: false, durability: null, instanceAttrs: { heal: 500 } },
  { itemInstanceId: 6, slotIndex: 5, itemId: 3002, itemName: "MP Potion (S)", category: "Consumable", type: "Potion", rarity: "Common", stackable: true, maxStack: 99, quantity: 28, bound: false, durability: null, instanceAttrs: { restore: 200 } },
  { itemInstanceId: 7, slotIndex: 6, itemId: 4001, itemName: "Teleport Crystal", category: "Consumable", type: "Crystal", rarity: "Uncommon", stackable: true, maxStack: 10, quantity: 5, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 8, slotIndex: 7, itemId: 1003, itemName: "Pale Edge", category: "Weapon", type: "Sword", rarity: "Rare", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: 100, instanceAttrs: { atk: 620, dex: 30 } },
  { itemInstanceId: 9, slotIndex: 8, itemId: 1004, itemName: "Wind Fleuret", category: "Weapon", type: "Rapier", rarity: "Rare", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: 85, instanceAttrs: { atk: 540, agi: 55 } },
  { itemInstanceId: 10, slotIndex: 9, itemId: 5001, itemName: "Iron Ore", category: "Material", type: "Ore", rarity: "Common", stackable: true, maxStack: 999, quantity: 156, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 11, slotIndex: 10, itemId: 5002, itemName: "Mithril Ingot", category: "Material", type: "Ingot", rarity: "Rare", stackable: true, maxStack: 100, quantity: 12, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 12, slotIndex: 11, itemId: 5003, itemName: "Dragon Scale", category: "Material", type: "Scale", rarity: "Epic", stackable: true, maxStack: 50, quantity: 4, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 13, slotIndex: 12, itemId: 2003, itemName: "Shadow Gauntlets", category: "Armor", type: "Gloves", rarity: "Uncommon", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: 65, instanceAttrs: { def: 85, str: 12 } },
  { itemInstanceId: 14, slotIndex: 13, itemId: 2004, itemName: "Frontliner's Helm", category: "Armor", type: "Helmet", rarity: "Rare", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: 90, instanceAttrs: { def: 180, vit: 20 } },
  { itemInstanceId: 15, slotIndex: 14, itemId: 6001, itemName: "Identification Scroll", category: "Misc", type: "Scroll", rarity: "Common", stackable: true, maxStack: 20, quantity: 8, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 16, slotIndex: 15, itemId: 3003, itemName: "Antidote (S)", category: "Consumable", type: "Potion", rarity: "Common", stackable: true, maxStack: 50, quantity: 15, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 17, slotIndex: 16, itemId: 1005, itemName: "Anneal Blade", category: "Weapon", type: "Sword", rarity: "Uncommon", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: 78, instanceAttrs: { atk: 420 } },
  { itemInstanceId: 18, slotIndex: 17, itemId: 7001, itemName: "Lucky Charm", category: "Accessory", type: "Charm", rarity: "Uncommon", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: null, instanceAttrs: { luc: 15 } },
  { itemInstanceId: 19, slotIndex: 18, itemId: 5004, itemName: "Ancient Wood", category: "Material", type: "Wood", rarity: "Rare", stackable: true, maxStack: 100, quantity: 23, bound: false, durability: null, instanceAttrs: {} },
  { itemInstanceId: 20, slotIndex: 19, itemId: 3004, itemName: "Revive Crystal", category: "Consumable", type: "Crystal", rarity: "Epic", stackable: true, maxStack: 3, quantity: 2, bound: false, durability: null, instanceAttrs: {} },
];

export const MOCK_GEAR_WEAPONS: InventoryEntry[] = MOCK_INVENTORY_ITEMS.filter(
  (item) => item.category === "Weapon",
);

export const MOCK_GEAR_ARMOR: InventoryEntry[] = MOCK_INVENTORY_ITEMS.filter(
  (item) => item.category === "Armor",
);

export const MOCK_GEAR_ACCESSORIES: InventoryEntry[] = MOCK_INVENTORY_ITEMS.filter(
  (item) => item.category === "Accessory",
);

export const MOCK_GEAR_BOOTS: InventoryEntry[] = MOCK_INVENTORY_ITEMS.filter(
  (item) => item.category === "Boots",
);

export const MOCK_MAIL_META: InventoryMeta = {
  capacitySlots: 30,
  usedSlots: 8,
  freeSlots: 22,
};

export const MOCK_MAIL_ITEMS: MailEntry[] = [
  { mailId: 1, slotIndex: 0, itemId: 8001, itemName: "HP Potion (L)", category: "Consumable", type: "Potion", rarity: "Uncommon", stackable: true, maxStack: 99, quantity: 10, bound: false, durability: null, instanceAttrs: { from: "System", message: "Daily login reward!" } },
  { mailId: 2, slotIndex: 1, itemId: 5002, itemName: "Mithril Ingot", category: "Material", type: "Ingot", rarity: "Rare", stackable: true, maxStack: 100, quantity: 3, bound: false, durability: null, instanceAttrs: { from: "AsunaMail", message: "I saved these for you :)" } },
  { mailId: 3, slotIndex: 2, itemId: 4001, itemName: "Teleport Crystal", category: "Consumable", type: "Crystal", rarity: "Uncommon", stackable: true, maxStack: 10, quantity: 2, bound: false, durability: null, instanceAttrs: { from: "Klein", message: "In case you need to escape fast!" } },
  { mailId: 4, slotIndex: 3, itemId: 9001, itemName: "Guild Invite Token", category: "Misc", type: "Token", rarity: "Uncommon", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: null, instanceAttrs: { from: "ALS_Heathcliff", message: "Join Knights of Blood?" } },
  { mailId: 5, slotIndex: 4, itemId: 3003, itemName: "Antidote (L)", category: "Consumable", type: "Potion", rarity: "Uncommon", stackable: true, maxStack: 50, quantity: 5, bound: false, durability: null, instanceAttrs: { from: "System", message: "Event reward for completing Floor 25." } },
  { mailId: 6, slotIndex: 5, itemId: 5001, itemName: "Iron Ore", category: "Material", type: "Ore", rarity: "Common", stackable: true, maxStack: 999, quantity: 50, bound: false, durability: null, instanceAttrs: { from: "Agil", message: "From the last raid loot split." } },
  { mailId: 7, slotIndex: 6, itemId: 6002, itemName: "Crafting Blueprint", category: "Misc", type: "Blueprint", rarity: "Rare", stackable: false, maxStack: 1, quantity: 1, bound: false, durability: null, instanceAttrs: { from: "Lisbeth", message: "Special sword blueprint I found!" } },
  { mailId: 8, slotIndex: 7, itemId: 3004, itemName: "Revive Crystal", category: "Consumable", type: "Crystal", rarity: "Epic", stackable: true, maxStack: 3, quantity: 1, bound: false, durability: null, instanceAttrs: { from: "Asuna", message: "Keep this safe, okay?" } },
];
