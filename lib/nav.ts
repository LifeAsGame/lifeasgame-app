export type MainNavId =
  | "player"
  | "skills"
  | "inventory"
  | "quests"
  | "social"
  | "lifelog"
  | "market"
  | "system";

export type PlayerSubId = "achievement" | "credentials" | "title" | "interests";
export type SkillsSubId = "passive" | "active";
export type InventorySubId = "items" | "gear" | "inbox";
export type InventoryGearPartId = "weapon" | "armor" | "accessory" | "boots";
export type QuestsSubId = "story" | "suggested" | "daily" | "party" | "guild";
export type SocialSubId = "party" | "guild" | "friend";
export type LifelogSubId = "collection" | "media" | "exercise";
export type MarketSubId = "wallet" | "shop" | "trade";
export type MarketShopSubId = "catalog" | "myListings";
export type SystemSubId = "options" | "help" | "logout";

export type PanelMenuItem = {
  id: string;
  label: string;
  slotLabel: string;
  description?: string;
};

export type PanelItemAction = {
  type: "edit" | "delete" | "cancel" | "equip" | "unequip" | "gift";
  label: string;
};

export type FormFieldSpec = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
};

export type PanelDataItem = {
  id: string;
  label: string;
  slotLabel: string;
  subtitle?: string;
  detailTitle?: string;
  detailDescription: string;
  detailRows: string[];
  contextTitle?: string;
  contextDescription?: string;
  contextRows?: string[];
  actions?: PanelItemAction[];
};

export type SocialContextData = {
  categoryLabel: string;
  title: string;
  subtitle?: string;
  description: string;
  rows: string[];
};

type PanelContext = {
  main: MainNavId;
  route: string;
};

export type PanelStackItem =
  | {
      id: string;
      kind: "menu";
      title: string;
      items: PanelMenuItem[];
      selectedId?: string;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "list";
      title: string;
      items: PanelDataItem[];
      selectedId?: string;
      actionLabel?: string;
      actionable?: boolean;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "placeholder";
      title: string;
      description: string;
      rows?: string[];
      primaryActionLabel?: string;
    }
  | {
      id: string;
      kind: "modal";
      title: string;
      description: string;
      rows?: string[];
      confirmLabel: string;
    }
  | {
      id: string;
      kind: "form";
      title: string;
      formKey: string;
      fields: FormFieldSpec[];
      submitLabel?: string;
      prefillValues?: Record<string, string>;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "message";
      title: string;
      friendId: string;
      friendName: string;
      context: { main: "social"; route: "social-message" };
    }
  | {
      id: string;
      kind: "gift";
      title: string;
      friendId: string;
      friendName: string;
      context: { main: "social"; route: "social-gift" };
    };

export const MAIN_NAV_ITEMS: Array<{ id: MainNavId; label: string; slotLabel: string }> = [
  { id: "player", label: "Player", slotLabel: "PL" },
  { id: "skills", label: "Skills", slotLabel: "SK" },
  { id: "inventory", label: "Inventory", slotLabel: "IN" },
  { id: "quests", label: "Quests", slotLabel: "QU" },
  { id: "social", label: "Social", slotLabel: "SO" },
  { id: "lifelog", label: "Lifelog", slotLabel: "LI" },
  { id: "market", label: "Market", slotLabel: "MK" },
  { id: "system", label: "System", slotLabel: "SY" },
];

export const MAIN_PANEL_TITLES: Record<MainNavId, string> = {
  player: "Player",
  skills: "Skills",
  inventory: "Inventory",
  quests: "Quests",
  social: "Social",
  lifelog: "Lifelog",
  market: "Market",
  system: "System",
};

export const SUBMENUS_BY_MAIN: Record<MainNavId, PanelMenuItem[]> = {
  player: [
    { id: "achievement", label: "Achievement", slotLabel: "AC" },
    { id: "credentials", label: "Credentials", slotLabel: "CR" },
    { id: "title", label: "Title", slotLabel: "TI" },
    { id: "interests", label: "Interests", slotLabel: "IN" },
  ],
  skills: [
    { id: "passive", label: "Passive", slotLabel: "PA" },
    { id: "active", label: "Active", slotLabel: "AV" },
  ],
  inventory: [
    { id: "items", label: "Items", slotLabel: "IT" },
    { id: "gear", label: "Gear", slotLabel: "GE" },
    { id: "inbox", label: "Inbox", slotLabel: "MB" },
  ],
  quests: [
    { id: "story", label: "Story", slotLabel: "ST" },
    { id: "suggested", label: "Suggested", slotLabel: "SG" },
    { id: "daily", label: "Daily", slotLabel: "DY" },
    { id: "party", label: "Party", slotLabel: "PT" },
    { id: "guild", label: "Guild", slotLabel: "GD" },
  ],
  social: [
    { id: "party", label: "Party", slotLabel: "PT" },
    { id: "guild", label: "Guild", slotLabel: "GD" },
    { id: "friend", label: "Friend", slotLabel: "FR" },
  ],
  lifelog: [
    { id: "collection", label: "Collection", slotLabel: "CL" },
    { id: "media", label: "Media", slotLabel: "MD" },
    { id: "exercise", label: "Exercise", slotLabel: "EX" },
  ],
  market: [
    { id: "wallet", label: "Wallet", slotLabel: "WL" },
    { id: "shop", label: "Shop", slotLabel: "SH" },
    { id: "trade", label: "Trade", slotLabel: "TR" },
  ],
  system: [
    { id: "options", label: "Options", slotLabel: "OP" },
    { id: "help", label: "Help", slotLabel: "HP" },
    { id: "logout", label: "Logout", slotLabel: "LO" },
  ],
};

export const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string | null> = {
  player: null,
  skills: null,
  inventory: null,
  quests: null,
  social: null,
  lifelog: null,
  market: null,
  system: null,
};

export const INVENTORY_GEAR_PARTS: PanelMenuItem[] = [
  { id: "weapon", label: "Weapon", slotLabel: "WP" },
  { id: "armor", label: "Armor", slotLabel: "AR" },
  { id: "accessory", label: "Accessory", slotLabel: "AC" },
  { id: "boots", label: "Boots", slotLabel: "BT" },
];

export const MARKET_SHOP_SECTIONS: PanelMenuItem[] = [
  { id: "catalog", label: "Catalog", slotLabel: "CA" },
  { id: "myListings", label: "My Listings", slotLabel: "ML" },
];

export const MARKET_TRADE_WINDOW_ACTIONS: PanelMenuItem[] = [
  { id: "review", label: "Review Offer", slotLabel: "RV" },
  { id: "confirm", label: "Confirm Trade", slotLabel: "CF" },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function pad(value: number, width = 2) {
  return value.toString().padStart(width, "0");
}

function dateAt(index: number) {
  const m = (index % 12) + 1;
  const d = ((index * 3) % 28) + 1;
  return `2026-${pad(m)}-${pad(d)}`;
}

// ─── Player ─────────────────────────────────────────────────────────────────

const ACHIEVEMENT_DATA = [
  { code: "FIRST_BLOOD", name: "First Blood", cat: "Combat", desc: "Defeated your first monster." },
  { code: "FLOOR_BOSS", name: "Floor Boss Slayer", cat: "Combat", desc: "Defeated a floor boss." },
  { code: "SOLO_RUN", name: "Solo Runner", cat: "Exploration", desc: "Cleared a dungeon entirely solo." },
  { code: "SPEED_RUN", name: "Speedrunner", cat: "Completion", desc: "Cleared a floor in record time." },
  { code: "BLACKSMITH_1", name: "Blacksmith Apprentice", cat: "Crafting", desc: "Crafted your first item." },
  { code: "DUAL_WIELD", name: "Dual Wield Mastery", cat: "Combat", desc: "Unlocked the Dual Wield skill." },
  { code: "PERFECT_GUARD", name: "Perfect Guard", cat: "Defense", desc: "Blocked 100 attacks with perfect timing." },
  { code: "MONSTER_HUNT", name: "Monster Hunter", cat: "Combat", desc: "Defeated 1000 monsters." },
  { code: "TREASURE_HUNT", name: "Treasure Hunter", cat: "Exploration", desc: "Found 50 hidden treasure rooms." },
  { code: "BEATER", name: "The Beater", cat: "Special", desc: "Recognized as a beta tester." },
  { code: "GUILD_FOUND", name: "Guild Founder", cat: "Social", desc: "Founded your first guild." },
  { code: "MKT_MASTER", name: "Market Master", cat: "Economy", desc: "Completed 100 market trades." },
  { code: "LVL_50", name: "Level 50 Milestone", cat: "Growth", desc: "Reached character level 50." },
  { code: "ENCHANT", name: "Enchantment Master", cat: "Crafting", desc: "Enchanted 50 items successfully." },
  { code: "NIGHT_RUN", name: "Night Runner", cat: "Exploration", desc: "Explored 10 dungeons at night." },
  { code: "PARTY_LEAD", name: "Party Leader", cat: "Social", desc: "Led a party to a boss clear." },
  { code: "RARE_ITEM", name: "Rare Collector", cat: "Collection", desc: "Obtained 20 rare+ items." },
  { code: "LEGEND_KILL", name: "Legend Slayer", cat: "Combat", desc: "Defeated a legendary-tier monster." },
];

const CERTIFICATION_DATA = [
  { name: "AWS Solutions Architect", issuer: "Amazon Web Services", cat: "Cloud", expires: "2028-06-15" },
  { name: "Python Professional", issuer: "Python Institute", cat: "Programming", expires: null },
  { name: "Kubernetes Administrator", issuer: "CNCF", cat: "DevOps", expires: "2027-09-10" },
  { name: "TOEIC 935", issuer: "ETS Korea", cat: "Language", expires: "2026-11-02" },
  { name: "Google Cloud Professional", issuer: "Google", cat: "Cloud", expires: "2027-12-01" },
  { name: "React Developer Certification", issuer: "Meta", cat: "Frontend", expires: null },
  { name: "Computer Science B.S.", issuer: "Seoul National University", cat: "Academic", expires: null },
  { name: "SQLD Database Developer", issuer: "Korea Data Agency", cat: "Database", expires: null },
  { name: "Security+ Certified", issuer: "CompTIA", cat: "Security", expires: "2028-10-05" },
  { name: "TypeScript Advanced", issuer: "Microsoft", cat: "Programming", expires: null },
  { name: "Docker Certified Associate", issuer: "Docker Inc.", cat: "DevOps", expires: "2027-05-28" },
  { name: "JLPT N3 Japanese", issuer: "Japan Foundation", cat: "Language", expires: null },
];

const TITLE_DATA = [
  { code: "BLACK_SWORDSMAN", name: "Black Swordsman", cat: "Achievement", desc: "The legendary solo player." },
  { code: "BEATER", name: "Beater", cat: "Special", desc: "A beta tester with prior knowledge." },
  { code: "SOLO_KING", name: "Solo King", cat: "Exploration", desc: "Cleared 10 floors solo." },
  { code: "FLOOR_CLEARER", name: "Floor Clearer", cat: "Combat", desc: "Front-line floor clearing." },
  { code: "DUAL_WIELDER", name: "Dual Wielder", cat: "Combat", desc: "Holder of Dual Wield skill." },
  { code: "MASTER_CRAFTER", name: "Master Crafter", cat: "Crafting", desc: "Crafted masterwork items." },
  { code: "GUILD_CHIEF", name: "Guild Chief", cat: "Social", desc: "Leader of a recognized guild." },
  { code: "LEGEND_SLAYER", name: "Legend Slayer", cat: "Combat", desc: "Slayer of legendary monsters." },
  { code: "MARKET_KING", name: "Market King", cat: "Economy", desc: "100 trades, perfect ratings." },
  { code: "NIGHT_WALKER", name: "Night Walker", cat: "Exploration", desc: "Nocturnal dungeon master." },
  { code: "FRONTLINER", name: "Frontliner", cat: "Rank", desc: "Active front-line team member." },
  { code: "RARE_HUNTER", name: "Rare Hunter", cat: "Collection", desc: "Collector of rare items." },
];

const HOBBY_DATA = [
  { name: "Programming", cat: "Tech", custom: "Full-Stack Dev", proficiency: 85, status: "ACTIVE", xp: 42000 },
  { name: "Reading", cat: "Learning", custom: "Tech & Fiction", proficiency: 72, status: "ACTIVE", xp: 28500 },
  { name: "Gaming", cat: "Entertainment", custom: "VR & JRPG", proficiency: 90, status: "ACTIVE", xp: 65000 },
  { name: "Running", cat: "Fitness", custom: "Morning Runs", proficiency: 60, status: "ACTIVE", xp: 12000 },
  { name: "Cooking", cat: "Lifestyle", custom: "Japanese Cuisine", proficiency: 55, status: "ACTIVE", xp: 9800 },
  { name: "Drawing", cat: "Art", custom: "Anime Sketching", proficiency: 40, status: "ON_HOLD", xp: 5200 },
  { name: "Guitar", cat: "Music", custom: "Acoustic Guitar", proficiency: 48, status: "ON_HOLD", xp: 7400 },
  { name: "Photography", cat: "Art", custom: "Street & Nature", proficiency: 63, status: "ACTIVE", xp: 11200 },
  { name: "Language Learning", cat: "Learning", custom: "Japanese N3→N2", proficiency: 65, status: "ACTIVE", xp: 18600 },
  { name: "Cycling", cat: "Fitness", custom: "Road Cycling", proficiency: 58, status: "ACTIVE", xp: 8900 },
  { name: "Meditation", cat: "Wellness", custom: "Mindfulness", proficiency: 45, status: "ACTIVE", xp: 4300 },
  { name: "Origami", cat: "Art", custom: "Complex Origami", proficiency: 35, status: "INACTIVE", xp: 2100 },
];

export const PLAYER_LISTS: Record<PlayerSubId, PanelDataItem[]> = {
  achievement: ACHIEVEMENT_DATA.map((a, i) => ({
    id: `achievement-${pad(i + 1, 3)}`,
    label: a.name,
    slotLabel: a.code.slice(0, 2),
    subtitle: `${a.cat} | Acquired: ${dateAt(i)}`,
    detailTitle: "Achievement Detail",
    detailDescription: a.desc,
    detailRows: [
      `Code: ${a.code}`,
      `Category: ${a.cat}`,
      `Acquired: ${dateAt(i)}`,
      `Status: Unlocked`,
    ],
  })),
  credentials: CERTIFICATION_DATA.map((c, i) => ({
    id: `credential-${pad(i + 1, 3)}`,
    label: c.name,
    slotLabel: c.cat.slice(0, 2).toUpperCase(),
    subtitle: `${c.issuer} | ${c.cat}`,
    detailTitle: "Credential Detail",
    detailDescription: `${c.name} issued by ${c.issuer}.`,
    detailRows: [
      `Issuer: ${c.issuer}`,
      `Category: ${c.cat}`,
      `Acquired: ${dateAt(i)}`,
      c.expires ? `Expires: ${c.expires}` : `Expires: Never`,
    ],
  })),
  title: TITLE_DATA.map((t, i) => ({
    id: `title-${pad(i + 1, 3)}`,
    label: t.name,
    slotLabel: t.code.slice(0, 2),
    subtitle: `${t.cat} | Acquired: ${dateAt(i)}`,
    detailTitle: "Title Detail",
    detailDescription: t.desc,
    detailRows: [
      `Code: ${t.code}`,
      `Category: ${t.cat}`,
      `Acquired: ${dateAt(i)}`,
      `Status: Unlocked`,
    ],
  })),
  interests: HOBBY_DATA.map((h, i) => ({
    id: `hobby-${pad(i + 1, 3)}`,
    label: h.custom,
    slotLabel: h.cat.slice(0, 2).toUpperCase(),
    subtitle: `${h.cat} | Proficiency: ${h.proficiency}/100 | ${h.status}`,
    detailTitle: "Interest Detail",
    detailDescription: `${h.name} — ${h.custom}`,
    detailRows: [
      `Category: ${h.cat}`,
      `Status: ${h.status}`,
      `Proficiency: ${h.proficiency}/100`,
      `XP: ${h.xp.toLocaleString()}`,
    ],
  })),
};

// ─── Skills ─────────────────────────────────────────────────────────────────

const PASSIVE_SKILLS = [
  { name: "Battle Healing", level: 48, desc: "Gradually restores HP during combat." },
  { name: "Extended Weight", level: 35, desc: "Increases carry weight capacity." },
  { name: "Night Vision", level: 22, desc: "Reduces penalty in dark environments." },
  { name: "Acrobatics", level: 55, desc: "Allows aerial combat maneuvers." },
  { name: "Searching", level: 41, desc: "Detects hidden enemies and items." },
  { name: "Listening", level: 38, desc: "Detects sounds beyond normal range." },
  { name: "Tracking", level: 29, desc: "Follows trails of players and monsters." },
  { name: "Martial Arts", level: 62, desc: "Unarmed combat mastery." },
  { name: "Meditation", level: 18, desc: "Accelerates MP regeneration when still." },
  { name: "Pain Mitigation", level: 44, desc: "Reduces stagger from critical hits." },
  { name: "Cooking", level: 71, desc: "Prepares food items with stat bonuses." },
  { name: "First Aid", level: 33, desc: "Emergency HP restoration skill." },
];

const ACTIVE_SKILLS = [
  { name: "Horizontal Square", level: 74, desc: "4-hit horizontal combo sword skill." },
  { name: "Vertical Square", level: 68, desc: "4-hit vertical combo sword skill." },
  { name: "Vorpal Strike", level: 82, desc: "Powerful single-hit piercing thrust." },
  { name: "Starburst Stream", level: 56, desc: "16-hit dual-blade combo. Ultimate skill." },
  { name: "The Eclipse", level: 48, desc: "Curved slash with extended range." },
  { name: "Sonic Leap", level: 62, desc: "Dashing forward slash with knockback." },
  { name: "Sharp Nail", level: 35, desc: "Quick 3-hit scratch attack." },
  { name: "Nova Ascension", level: 44, desc: "Rising uppercut with aerial follow-up." },
  { name: "Meteor Fall", level: 58, desc: "Downward smash from midair." },
  { name: "Cyclone", level: 39, desc: "360-degree spinning slash." },
  { name: "Rage Spike", level: 71, desc: "Ground-skimming low thrust skill." },
  { name: "Howling Octave", level: 65, desc: "8-hit rapid sword barrage." },
];

export const SKILLS_LISTS: Record<SkillsSubId, PanelDataItem[]> = {
  passive: PASSIVE_SKILLS.map((s, i) => ({
    id: `skill-passive-${pad(i + 1, 3)}`,
    label: s.name,
    slotLabel: `P${(i % 9) + 1}`,
    subtitle: `Lv.${s.level} | Passive`,
    detailTitle: "Passive Skill Detail",
    detailDescription: s.desc,
    detailRows: [
      `Skill Level: ${s.level}`,
      `Type: Passive`,
      `Last Used: ${dateAt(i)}`,
      `Status: Active`,
    ],
  })),
  active: ACTIVE_SKILLS.map((s, i) => ({
    id: `skill-active-${pad(i + 1, 3)}`,
    label: s.name,
    slotLabel: `A${(i % 9) + 1}`,
    subtitle: `Lv.${s.level} | Active`,
    detailTitle: "Active Skill Detail",
    detailDescription: s.desc,
    detailRows: [
      `Skill Level: ${s.level}`,
      `Type: Active`,
      `Last Used: ${dateAt(i + 1)}`,
      `Cooldown: ${((i % 8) + 2)}s`,
    ],
  })),
};

// ─── Inventory ───────────────────────────────────────────────────────────────

const INV_ITEMS = [
  { name: "Elucidator", cat: "Weapon", type: "Sword", rarity: "Legendary", qty: 1, dur: 98 },
  { name: "Dark Repulser", cat: "Weapon", type: "Sword", rarity: "Legendary", qty: 1, dur: 95 },
  { name: "Black Coat of Midnight", cat: "Armor", type: "Coat", rarity: "Epic", qty: 1, dur: 88 },
  { name: "Windrunner Boots", cat: "Boots", type: "Boots", rarity: "Rare", qty: 1, dur: 72 },
  { name: "HP Potion (M)", cat: "Consumable", type: "Potion", rarity: "Common", qty: 42, dur: null },
  { name: "MP Potion (S)", cat: "Consumable", type: "Potion", rarity: "Common", qty: 28, dur: null },
  { name: "Teleport Crystal", cat: "Consumable", type: "Crystal", rarity: "Uncommon", qty: 5, dur: null },
  { name: "Pale Edge", cat: "Weapon", type: "Sword", rarity: "Rare", qty: 1, dur: 100 },
  { name: "Wind Fleuret", cat: "Weapon", type: "Rapier", rarity: "Rare", qty: 1, dur: 85 },
  { name: "Iron Ore", cat: "Material", type: "Ore", rarity: "Common", qty: 156, dur: null },
  { name: "Mithril Ingot", cat: "Material", type: "Ingot", rarity: "Rare", qty: 12, dur: null },
  { name: "Dragon Scale", cat: "Material", type: "Scale", rarity: "Epic", qty: 4, dur: null },
  { name: "Shadow Gauntlets", cat: "Armor", type: "Gloves", rarity: "Uncommon", qty: 1, dur: 65 },
  { name: "Frontliner's Helm", cat: "Armor", type: "Helmet", rarity: "Rare", qty: 1, dur: 90 },
  { name: "Identification Scroll", cat: "Misc", type: "Scroll", rarity: "Common", qty: 8, dur: null },
  { name: "Antidote (S)", cat: "Consumable", type: "Potion", rarity: "Common", qty: 15, dur: null },
  { name: "Anneal Blade", cat: "Weapon", type: "Sword", rarity: "Uncommon", qty: 1, dur: 78 },
  { name: "Lucky Charm", cat: "Accessory", type: "Charm", rarity: "Uncommon", qty: 1, dur: null },
  { name: "Ancient Wood", cat: "Material", type: "Wood", rarity: "Rare", qty: 23, dur: null },
  { name: "Revive Crystal", cat: "Consumable", type: "Crystal", rarity: "Epic", qty: 2, dur: null },
];

export const INVENTORY_ITEMS_LIST: PanelDataItem[] = INV_ITEMS.map((item, i) => ({
  id: `inventory-item-${pad(i + 1, 3)}`,
  label: item.name,
  slotLabel: item.cat.slice(0, 2).toUpperCase(),
  subtitle: `Qty ${item.qty} | ${item.rarity} | ${item.cat}`,
  detailTitle: "Item Detail",
  detailDescription: `${item.name} — ${item.type}`,
  detailRows: [
    `Category: ${item.cat}`,
    `Type: ${item.type}`,
    `Rarity: ${item.rarity}`,
    item.dur !== null ? `Durability: ${item.dur}/100` : `Quantity: ${item.qty}`,
  ],
}));

const GEAR_WEAPONS = INV_ITEMS.filter((i) => i.cat === "Weapon");
const GEAR_ARMOR = INV_ITEMS.filter((i) => i.cat === "Armor");
const GEAR_ACCESSORIES = INV_ITEMS.filter((i) => i.cat === "Accessory");
const GEAR_BOOTS = INV_ITEMS.filter((i) => i.cat === "Boots");

function makeGearList(items: typeof INV_ITEMS, prefix: string): PanelDataItem[] {
  return items.map((item, i) => ({
    id: `${prefix}-${pad(i + 1, 3)}`,
    label: item.name,
    slotLabel: item.type.slice(0, 2).toUpperCase(),
    subtitle: `${item.rarity} | ${item.type}${item.dur !== null ? ` | Dur: ${item.dur}` : ""}`,
    detailTitle: `${item.type} Detail`,
    detailDescription: `${item.name} — ${item.type} class equipment.`,
    detailRows: [
      `Rarity: ${item.rarity}`,
      `Type: ${item.type}`,
      item.dur !== null ? `Durability: ${item.dur}/100` : `Non-degradable`,
      `Slot: ${item.cat}`,
    ],
    actions: [
      { type: "equip", label: "장착" },
      { type: "unequip", label: "해제" },
    ],
  }));
}

export const INVENTORY_GEAR_LISTS: Record<InventoryGearPartId, PanelDataItem[]> = {
  weapon: makeGearList(GEAR_WEAPONS, "inv-weapon"),
  armor: makeGearList(GEAR_ARMOR, "inv-armor"),
  accessory: makeGearList(GEAR_ACCESSORIES, "inv-acc"),
  boots: makeGearList(GEAR_BOOTS, "inv-boots"),
};

const MAIL_DATA = [
  { from: "System", item: "HP Potion (L) ×10", msg: "Daily login reward!" },
  { from: "Asuna", item: "Mithril Ingot ×3", msg: "I saved these for you :)" },
  { from: "Klein", item: "Teleport Crystal ×2", msg: "In case you need to escape!" },
  { from: "ALS_Heathcliff", item: "Guild Invite Token", msg: "Join Knights of Blood?" },
  { from: "System", item: "Antidote (L) ×5", msg: "Floor 25 event reward." },
  { from: "Agil", item: "Iron Ore ×50", msg: "Raid loot split." },
  { from: "Lisbeth", item: "Crafting Blueprint", msg: "Special sword blueprint!" },
  { from: "Asuna", item: "Revive Crystal ×1", msg: "Keep this safe, okay?" },
];

export const INVENTORY_INBOX_LIST: PanelDataItem[] = MAIL_DATA.map((m, i) => ({
  id: `mail-${pad(i + 1, 3)}`,
  label: m.from,
  slotLabel: m.from.slice(0, 2).toUpperCase(),
  subtitle: `Item: ${m.item}`,
  detailTitle: "Mail Detail",
  detailDescription: m.msg,
  detailRows: [
    `From: ${m.from}`,
    `Item: ${m.item}`,
    `Received: ${dateAt(i)}`,
    `Expires in: ${(i % 14) + 2} days`,
  ],
}));

// ─── Quests ──────────────────────────────────────────────────────────────────

const STORY_QUESTS = [
  { code: "STORY_FL01_001", title: "The Beginning", status: "COMPLETED", progress: 100, target: 1, cat: "Story" },
  { code: "STORY_FL05_001", title: "Blazing Colossus", status: "COMPLETED", progress: 100, target: 1, cat: "Story" },
  { code: "STORY_FL10_001", title: "The Gleam Eyes", status: "COMPLETED", progress: 100, target: 1, cat: "Story" },
  { code: "STORY_FL25_001", title: "Into the Labyrinth", status: "IN_PROGRESS", progress: 78, target: 100, cat: "Story" },
  { code: "STORY_FL25_002", title: "The Black Iron Palace", status: "PENDING", progress: 0, target: 1, cat: "Story" },
  { code: "STORY_DUAL_001", title: "The Dual Blades", status: "IN_PROGRESS", progress: 62, target: 100, cat: "Story" },
];

const SUGGESTED_QUESTS = [
  { code: "SUGGEST_DUNG_001", title: "Dark Forest Dungeon", reward: 5000, repeat: "NONE", target: "BOSS_KILL" },
  { code: "SUGGEST_CRAFT_002", title: "Forge a Rare Weapon", reward: 3000, repeat: "NONE", target: "CRAFT_RARITY" },
  { code: "SUGGEST_LVL_001", title: "Reach Level 80", reward: 10000, repeat: "NONE", target: "LEVEL" },
  { code: "SUGGEST_SOCIAL_002", title: "Join a Guild", reward: 2000, repeat: "NONE", target: "JOIN_GUILD" },
  { code: "SUGGEST_COLL_001", title: "Rare Item Hunter", reward: 4000, repeat: "NONE", target: "ITEM_RARITY_COUNT" },
];

const DAILY_QUESTS = [
  { code: "DAILY_EXP_001", title: "Morning Grind", reward: 1200, target: "KILL_COUNT", value: 20 },
  { code: "DAILY_CRAFT_001", title: "Daily Crafting", reward: 800, target: "CRAFT_COUNT", value: 3 },
  { code: "DAILY_EXER_001", title: "Exercise Log", reward: 600, target: "EXERCISE_MINUTES", value: 30 },
  { code: "DAILY_READ_001", title: "Reading Time", reward: 500, target: "READ_MINUTES", value: 20 },
  { code: "DAILY_MARKET_001", title: "Market Visit", reward: 400, target: "TRADE_COUNT", value: 1 },
  { code: "DAILY_SOCIAL_001", title: "Social Interaction", reward: 300, target: "MESSAGE_COUNT", value: 2 },
];

const PARTY_QUESTS = [
  { code: "PARTY_DUNG_001", title: "Haunted Keep Raid", status: "PENDING", progress: 0, target: 1 },
  { code: "PARTY_KILL_001", title: "Monster Purge", status: "IN_PROGRESS", progress: 87, target: 200 },
  { code: "PARTY_BOSS_001", title: "Dark Knight Challenge", status: "COMPLETED", progress: 100, target: 1 },
];

const GUILD_QUESTS = [
  { code: "GUILD_CONQ_001", title: "Territory Conquest", status: "IN_PROGRESS", progress: 24, target: 48 },
  { code: "GUILD_CRAFT_001", title: "Guild Forge Event", status: "IN_PROGRESS", progress: 43, target: 100 },
  { code: "GUILD_MKT_001", title: "Market Domination", status: "IN_PROGRESS", progress: 312, target: 500 },
];

export const QUEST_LISTS: Record<QuestsSubId, PanelDataItem[]> = {
  story: STORY_QUESTS.map((q, i) => ({
    id: `quest-story-${pad(i + 1, 3)}`,
    label: q.title,
    slotLabel: `S${i + 1}`,
    subtitle: `${q.status} | Progress: ${q.progress}/${q.target}`,
    detailTitle: "Story Quest Detail",
    detailDescription: `${q.title} — Story arc quest.`,
    detailRows: [
      `Code: ${q.code}`,
      `Status: ${q.status}`,
      `Progress: ${q.progress}/${q.target}`,
      `Category: ${q.cat}`,
    ],
    actions: q.status === "IN_PROGRESS" ? [{ type: "cancel", label: "취소" }] : undefined,
  })),
  suggested: SUGGESTED_QUESTS.map((q, i) => ({
    id: `quest-suggested-${pad(i + 1, 3)}`,
    label: q.title,
    slotLabel: `G${i + 1}`,
    subtitle: `Reward: ${q.reward} EXP | ${q.target}`,
    detailTitle: "Quest Detail",
    detailDescription: `${q.title} — Suggested quest.`,
    detailRows: [
      `Code: ${q.code}`,
      `Repeat: ${q.repeat}`,
      `Target: ${q.target}`,
      `Reward EXP: ${q.reward}`,
    ],
    actions: [{ type: "equip", label: "수락" }],
  })),
  daily: DAILY_QUESTS.map((q, i) => ({
    id: `quest-daily-${pad(i + 1, 3)}`,
    label: q.title,
    slotLabel: `D${i + 1}`,
    subtitle: `Reward: ${q.reward} EXP | ${q.target}: ${q.value}`,
    detailTitle: "Daily Quest Detail",
    detailDescription: `${q.title} — Daily recurring quest.`,
    detailRows: [
      `Code: ${q.code}`,
      `Target: ${q.target}`,
      `Value: ${q.value}`,
      `Reward EXP: ${q.reward}`,
    ],
    actions: [{ type: "equip", label: "수락" }, { type: "cancel", label: "취소" }],
  })),
  party: PARTY_QUESTS.map((q, i) => ({
    id: `quest-party-${pad(i + 1, 3)}`,
    label: q.title,
    slotLabel: `P${i + 1}`,
    subtitle: `${q.status} | Progress: ${q.progress}/${q.target}`,
    detailTitle: "Party Quest Detail",
    detailDescription: `${q.title} — Party quest.`,
    detailRows: [
      `Code: ${q.code}`,
      `Status: ${q.status}`,
      `Progress: ${q.progress}/${q.target}`,
      `Type: Party`,
    ],
    actions: q.status !== "COMPLETED" ? [{ type: "cancel", label: "취소" }] : undefined,
  })),
  guild: GUILD_QUESTS.map((q, i) => ({
    id: `quest-guild-${pad(i + 1, 3)}`,
    label: q.title,
    slotLabel: `G${i + 1}`,
    subtitle: `${q.status} | Progress: ${q.progress}/${q.target}`,
    detailTitle: "Guild Quest Detail",
    detailDescription: `${q.title} — Guild collective quest.`,
    detailRows: [
      `Code: ${q.code}`,
      `Status: ${q.status}`,
      `Progress: ${q.progress}/${q.target}`,
      `Type: Guild`,
    ],
    actions: [{ type: "cancel", label: "취소" }],
  })),
};

// ─── Social ──────────────────────────────────────────────────────────────────

const PARTY_DATA = [
  { name: "Frontline Assault", code: "FLA-001", members: 5, max: 6, policy: "OPEN", tags: "PvE, Boss" },
  { name: "Night Raiders", code: "NRD-002", members: 4, max: 4, policy: "APPLICATION", tags: "Stealth, Night" },
  { name: "Market Syndicate", code: "MKS-003", members: 3, max: 3, policy: "INVITE_ONLY", tags: "Trade" },
  { name: "Skill Hunters", code: "SKH-004", members: 4, max: 6, policy: "OPEN", tags: "Skills, EXP" },
  { name: "The Wanderers", code: "WND-005", members: 5, max: 5, policy: "OPEN", tags: "Exploration" },
  { name: "Crafters Union", code: "CRU-006", members: 7, max: 8, policy: "APPLICATION", tags: "Crafting" },
  { name: "Solo Support", code: "SSP-007", members: 1, max: 2, policy: "OPEN", tags: "Support" },
  { name: "Dragon Slayers", code: "DRS-008", members: 5, max: 6, policy: "APPLICATION", tags: "Boss" },
];

const GUILD_DATA = [
  { name: "Knights of Aincrad", code: "KOA-001", members: 42, max: 50, policy: "APPLICATION", rank: 1 },
  { name: "Thunder Wolves", code: "TWL-002", members: 28, max: 30, policy: "APPLICATION", rank: 3 },
  { name: "Merchant Lords", code: "MCL-003", members: 18, max: 20, policy: "INVITE_ONLY", rank: 5 },
  { name: "Phantom Blades", code: "PHB-004", members: 12, max: 15, policy: "INVITE_ONLY", rank: 8 },
  { name: "Eternal Crafters", code: "ETC-005", members: 35, max: 40, policy: "OPEN", rank: 4 },
  { name: "Seekers of Lore", code: "SOL-006", members: 22, max: 25, policy: "APPLICATION", rank: 6 },
];

const FRIEND_DATA = [
  { nickname: "Asuna", level: 76, job: "Fencer", status: "ONLINE", muted: false },
  { nickname: "Klein", level: 65, job: "Samurai", status: "IN_DUNGEON", muted: false },
  { nickname: "Agil", level: 72, job: "Warrior", status: "ONLINE", muted: true },
  { nickname: "Lisbeth", level: 60, job: "Blacksmith", status: "CRAFTING", muted: false },
  { nickname: "Silica", level: 55, job: "Beast Tamer", status: "ONLINE", muted: false },
  { nickname: "Leafa", level: 48, job: "Spriggan", status: "AWAY", muted: false },
  { nickname: "Sinon", level: 70, job: "Gunner", status: "ONLINE", muted: false },
  { nickname: "Eugeo", level: 68, job: "Swordsman", status: "OFFLINE", muted: false },
  { nickname: "Alice", level: 80, job: "Integrity Knight", status: "ONLINE", muted: false },
  { nickname: "Heathcliff", level: 100, job: "Paladin", status: "AWAY", muted: false },
];

export const SOCIAL_LISTS: Record<SocialSubId, PanelDataItem[]> = {
  party: PARTY_DATA.map((p, i) => ({
    id: `social-party-${pad(i + 1, 3)}`,
    label: p.name,
    slotLabel: `PT`,
    subtitle: `${p.members}/${p.max} members | ${p.policy}`,
    detailTitle: "Party Detail",
    detailDescription: `${p.name} — Active party.`,
    detailRows: [
      `Code: ${p.code}`,
      `Members: ${p.members}/${p.max}`,
      `Join Policy: ${p.policy}`,
      `Tags: ${p.tags}`,
    ],
    contextTitle: p.name,
    contextDescription: `Active party with ${p.members}/${p.max} members. Join policy: ${p.policy}.`,
    contextRows: [
      `Code: ${p.code}`,
      `Recruitment: ${p.policy}`,
      `Tags: ${p.tags}`,
      `Last Activity: ${dateAt(i + 1)}`,
    ],
  })),
  guild: GUILD_DATA.map((g, i) => ({
    id: `social-guild-${pad(i + 1, 3)}`,
    label: g.name,
    slotLabel: `GD`,
    subtitle: `${g.members}/${g.max} members | Rank ${g.rank}`,
    detailTitle: "Guild Detail",
    detailDescription: `${g.name} — Established guild.`,
    detailRows: [
      `Code: ${g.code}`,
      `Members: ${g.members}/${g.max}`,
      `Join Policy: ${g.policy}`,
      `Rank: #${g.rank}`,
    ],
    contextTitle: g.name,
    contextDescription: `Established guild, ranked #${g.rank} in Aincrad. Join policy: ${g.policy}.`,
    contextRows: [
      `Code: ${g.code}`,
      `Members: ${g.members}/${g.max}`,
      `Join Rule: ${g.policy}`,
      `Rank: #${g.rank}`,
    ],
  })),
  friend: FRIEND_DATA.map((f, i) => ({
    id: `social-friend-${pad(i + 1, 3)}`,
    label: f.nickname,
    slotLabel: f.nickname.slice(0, 2).toUpperCase(),
    subtitle: `Lv.${f.level} ${f.job} | ${f.status}${f.muted ? " | MUTED" : ""}`,
    detailTitle: "Friend Detail",
    detailDescription: `${f.nickname} — ${f.job}, Level ${f.level}.`,
    detailRows: [
      `Job: ${f.job}`,
      `Level: ${f.level}`,
      `Status: ${f.status}`,
      `Muted: ${f.muted ? "Yes" : "No"}`,
    ],
    contextTitle: f.nickname,
    contextDescription: `${f.nickname}, Lv.${f.level} ${f.job}. Currently ${f.status.toLowerCase().replace("_", " ")}.`,
    contextRows: [
      `Job: ${f.job}`,
      `Level: ${f.level}`,
      `Status: ${f.status}`,
      `Last Seen: ${dateAt(i + 1)}`,
    ],
    actions: [
      { type: "gift", label: "선물" },
      { type: "delete", label: "언팔로우" },
    ],
  })),
};

// ─── Lifelog ─────────────────────────────────────────────────────────────────

const COLLECTION_DATA = [
  { title: "Kirito 1/7 Scale Figure", cat: "Figure", qty: 1, cond: "Mint in box", from: "Good Smile" },
  { title: "Asuna ALO Ver. Figure", cat: "Figure", qty: 1, cond: "Mint", from: "Kotobukiya" },
  { title: "SAO Progressive Manga", cat: "Manga", qty: 8, cond: "Like new", from: "Kyobo" },
  { title: "SAO Light Novel JP Complete", cat: "Light Novel", qty: 27, cond: "JP edition", from: "Amazon JP" },
  { title: "SAO Artbook Vol. 1", cat: "Artbook", qty: 1, cond: "Like new", from: "Comiket" },
  { title: "Elucidator Replica Sword", cat: "Merchandise", qty: 1, cond: "Display", from: "Animax Shop" },
  { title: "SAO Complete Series Bluray", cat: "Bluray", qty: 1, cond: "Sealed", from: "Aniplex" },
  { title: "SAO Enamel Pin Set", cat: "Merchandise", qty: 12, cond: "Complete set", from: "CR Shop" },
];

const MEDIA_DATA = [
  { title: "Sword Art Online", cat: "Anime", cur: 25, total: 25, status: "COMPLETED", rating: 9.5 },
  { title: "Attack on Titan", cat: "Anime", cur: 87, total: 87, status: "COMPLETED", rating: 9.8 },
  { title: "Demon Slayer", cat: "Anime", cur: 26, total: 26, status: "COMPLETED", rating: 9.2 },
  { title: "Clean Code", cat: "Book", cur: 464, total: 464, status: "COMPLETED", rating: 9.0 },
  { title: "Fullmetal Alchemist: Brotherhood", cat: "Anime", cur: 48, total: 64, status: "WATCHING", rating: null },
  { title: "The Pragmatic Programmer", cat: "Book", cur: 100, total: 352, status: "READING", rating: null },
  { title: "Your Name", cat: "Movie", cur: 1, total: 1, status: "COMPLETED", rating: 10.0 },
  { title: "Overlord", cat: "Anime", cur: 0, total: 13, status: "PLAN_TO_WATCH", rating: null },
  { title: "Designing Data-Intensive Apps", cat: "Book", cur: 250, total: 616, status: "READING", rating: null },
  { title: "Spirited Away", cat: "Movie", cur: 1, total: 1, status: "COMPLETED", rating: 9.9 },
];

const EXERCISE_DATA = [
  { cat: "Running", dur: 32, dist: 5.2, cal: 310, date: "2026-03-02" },
  { cat: "Cycling", dur: 75, dist: 28.4, cal: 620, date: "2026-03-01" },
  { cat: "Strength Training", dur: 55, dist: null, cal: 380, date: "2026-02-28" },
  { cat: "Swimming", dur: 40, dist: 1.5, cal: 420, date: "2026-02-26" },
  { cat: "Running", dur: 28, dist: 4.8, cal: 285, date: "2026-02-25" },
  { cat: "Yoga", dur: 45, dist: null, cal: 120, date: "2026-02-24" },
  { cat: "Hiking", dur: 180, dist: 12.0, cal: 850, date: "2026-02-22" },
  { cat: "Strength Training", dur: 60, dist: null, cal: 420, date: "2026-02-21" },
  { cat: "Running", dur: 35, dist: 6.0, cal: 360, date: "2026-02-19" },
  { cat: "Cycling", dur: 90, dist: 35.2, cal: 750, date: "2026-02-16" },
  { cat: "Jump Rope", dur: 20, dist: null, cal: 200, date: "2026-02-15" },
  { cat: "Swimming", dur: 50, dist: 2.0, cal: 530, date: "2026-02-12" },
];

const CRUD_ACTIONS: PanelItemAction[] = [
  { type: "edit", label: "수정" },
  { type: "delete", label: "삭제" },
];

export const LIFELOG_LISTS: Record<LifelogSubId, PanelDataItem[]> = {
  collection: COLLECTION_DATA.map((c, i) => ({
    id: `lifelog-collection-${pad(i + 1, 3)}`,
    label: c.title,
    slotLabel: c.cat.slice(0, 2).toUpperCase(),
    subtitle: `${c.cat} | Qty: ${c.qty} | ${c.cond}`,
    detailTitle: "Collection Detail",
    detailDescription: `${c.title} — ${c.cat}`,
    detailRows: [
      `Category: ${c.cat}`,
      `Quantity: ${c.qty}`,
      `Condition: ${c.cond}`,
      `Source: ${c.from}`,
    ],
    actions: CRUD_ACTIONS,
  })),
  media: MEDIA_DATA.map((m, i) => ({
    id: `lifelog-media-${pad(i + 1, 3)}`,
    label: m.title,
    slotLabel: m.cat.slice(0, 2).toUpperCase(),
    subtitle: `${m.cat} | ${m.status}${m.rating !== null ? ` | ★${m.rating}` : ""}`,
    detailTitle: "Media Log Detail",
    detailDescription: `${m.title} — ${m.cat}`,
    detailRows: [
      `Type: ${m.cat}`,
      `Status: ${m.status}`,
      `Progress: ${m.cur}/${m.total}`,
      m.rating !== null ? `Rating: ★${m.rating}` : `Not rated yet`,
    ],
    actions: CRUD_ACTIONS,
  })),
  exercise: EXERCISE_DATA.map((e, i) => ({
    id: `lifelog-exercise-${pad(i + 1, 3)}`,
    label: `${e.cat} — ${e.date}`,
    slotLabel: e.cat.slice(0, 2).toUpperCase(),
    subtitle: `${e.dur}min | ${e.cal} kcal${e.dist !== null ? ` | ${e.dist}km` : ""}`,
    detailTitle: "Exercise Detail",
    detailDescription: `${e.cat} session on ${e.date}.`,
    detailRows: [
      `Category: ${e.cat}`,
      `Duration: ${e.dur} min`,
      `Calories Burned: ${e.cal} kcal`,
      e.dist !== null ? `Distance: ${e.dist} km` : `No distance tracked`,
    ],
    actions: CRUD_ACTIONS,
  })),
};

// ─── Market ──────────────────────────────────────────────────────────────────

const WALLET_TRANSACTIONS = [
  { type: "SELL", item: "Pale Edge", amount: 35000, partner: "Klein", date: "2026-03-02" },
  { type: "BUY", item: "Mithril Plate ×3", amount: -12000, partner: "Shop", date: "2026-03-01" },
  { type: "SELL", item: "Iron Ore ×50", amount: 2500, partner: "Agil", date: "2026-02-28" },
  { type: "SELL", item: "Dragon Scale ×1", amount: 55000, partner: "Lisbeth", date: "2026-02-27" },
  { type: "BUY", item: "HP Potion (L) ×20", amount: -4000, partner: "Shop", date: "2026-02-25" },
  { type: "REWARD", item: "Party quest reward", amount: 8500, partner: "System", date: "2026-02-22" },
  { type: "BUY", item: "Enchant Scroll ×2", amount: -9800, partner: "Argo", date: "2026-02-20" },
];

const CATALOG_ITEMS = [
  { name: "Liberator Sword", cat: "Weapon", rarity: "Epic", price: 45000, stock: 3 },
  { name: "Night Sky Blade", cat: "Weapon", rarity: "Rare", price: 28000, stock: 7 },
  { name: "Crystalline Breastplate", cat: "Armor", rarity: "Epic", price: 62000, stock: 2 },
  { name: "HP Potion (L)", cat: "Consumable", rarity: "Uncommon", price: 2500, stock: 98 },
  { name: "MP Potion (M)", cat: "Consumable", rarity: "Common", price: 1800, stock: 200 },
  { name: "Floor Teleport Crystal", cat: "Consumable", rarity: "Uncommon", price: 8000, stock: 15 },
  { name: "Mithril Plate", cat: "Material", rarity: "Rare", price: 18000, stock: 50 },
  { name: "Enchantment Scroll (ATK)", cat: "Scroll", rarity: "Uncommon", price: 6500, stock: 30 },
  { name: "Shadow Cloak", cat: "Armor", rarity: "Epic", price: 32000, stock: 4 },
  { name: "Steel Broadsword", cat: "Weapon", rarity: "Uncommon", price: 15000, stock: 12 },
  { name: "Stamina Boost Potion", cat: "Consumable", rarity: "Common", price: 3200, stock: 80 },
  { name: "Orichalcum Ore", cat: "Material", rarity: "Legendary", price: 120000, stock: 1 },
];

const MY_LISTINGS_DATA = [
  { name: "Pale Edge (Sword)", price: 35000, status: "ACTIVE", watches: 12 },
  { name: "Mithril Ingot ×3", price: 8500, status: "ACTIVE", watches: 7 },
  { name: "HP Potion (M) ×10", price: 1200, status: "ACTIVE", watches: 3 },
  { name: "Lucky Charm", price: 12000, status: "RESERVED", watches: 18 },
  { name: "Dragon Scale ×1", price: 55000, status: "ACTIVE", watches: 24 },
];

const TRADE_PARTNERS = [
  { nickname: "Asuna", level: 76, trust: 98, status: "ONLINE", trades: 14 },
  { nickname: "Klein", level: 65, trust: 88, status: "IN_DUNGEON", trades: 8 },
  { nickname: "Agil", level: 72, trust: 95, status: "ONLINE", trades: 22 },
  { nickname: "Lisbeth", level: 60, trust: 92, status: "CRAFTING", trades: 11 },
  { nickname: "Argo", level: 63, trust: 80, status: "ONLINE", trades: 6 },
  { nickname: "Heathcliff", level: 100, trust: 75, status: "AWAY", trades: 3 },
];

export const MARKET_WALLET_SUMMARY_LIST: PanelDataItem[] = WALLET_TRANSACTIONS.map((t, i) => ({
  id: `wallet-tx-${pad(i + 1, 3)}`,
  label: `${t.type}: ${t.item}`,
  slotLabel: t.type.slice(0, 2),
  subtitle: `${t.amount > 0 ? "+" : ""}${t.amount.toLocaleString()} col | ${t.partner} | ${t.date}`,
  detailTitle: "Transaction Detail",
  detailDescription: `${t.type} transaction on ${t.date}.`,
  detailRows: [
    `Type: ${t.type}`,
    `Item: ${t.item}`,
    `Amount: ${t.amount > 0 ? "+" : ""}${t.amount.toLocaleString()} col`,
    `Partner: ${t.partner}`,
  ],
}));

export const MARKET_SHOP_CATALOG_LIST: PanelDataItem[] = CATALOG_ITEMS.map((item, i) => ({
  id: `catalog-${pad(i + 1, 3)}`,
  label: item.name,
  slotLabel: item.rarity.slice(0, 2).toUpperCase(),
  subtitle: `${item.rarity} | ${item.price.toLocaleString()} col | Stock: ${item.stock}`,
  detailTitle: "Item Detail / Buy",
  detailDescription: `${item.name} — ${item.cat}`,
  detailRows: [
    `Category: ${item.cat}`,
    `Rarity: ${item.rarity}`,
    `Price: ${item.price.toLocaleString()} col`,
    `Stock: ${item.stock}`,
  ],
}));

export const MARKET_SHOP_MY_LISTINGS: PanelDataItem[] = MY_LISTINGS_DATA.map((l, i) => ({
  id: `my-listing-${pad(i + 1, 3)}`,
  label: l.name,
  slotLabel: "ML",
  subtitle: `${l.price.toLocaleString()} col | ${l.status} | Watches: ${l.watches}`,
  detailTitle: "Listing Detail",
  detailDescription: `Your listing: ${l.name}`,
  detailRows: [
    `Price: ${l.price.toLocaleString()} col`,
    `Status: ${l.status}`,
    `Watches: ${l.watches}`,
    `Listed: ${dateAt(i)}`,
  ],
  actions: l.status === "ACTIVE" ? [{ type: "cancel", label: "취소" }] : undefined,
}));

export const MARKET_TRADE_FRIENDS: PanelDataItem[] = TRADE_PARTNERS.map((p, i) => ({
  id: `trade-partner-${pad(i + 1, 3)}`,
  label: p.nickname,
  slotLabel: p.nickname.slice(0, 2).toUpperCase(),
  subtitle: `Lv.${p.level} | Trust: ${p.trust}/100 | ${p.status}`,
  detailTitle: "Trade Window",
  detailDescription: `Trade session with ${p.nickname}.`,
  detailRows: [
    `Level: ${p.level}`,
    `Trust Score: ${p.trust}/100`,
    `Status: ${p.status}`,
    `Past Trades: ${p.trades}`,
  ],
}));

// ─── Form Field Definitions ──────────────────────────────────────────────────

export const EXERCISE_FORM_FIELDS: FormFieldSpec[] = [
  { key: "category", label: "Category", type: "select", options: [
    { value: "CARDIO", label: "Cardio" }, { value: "STRENGTH", label: "Strength" },
    { value: "YOGA", label: "Yoga" }, { value: "STRETCHING", label: "Stretching" },
    { value: "WALKING", label: "Walking" }, { value: "CYCLING", label: "Cycling" },
    { value: "SWIMMING", label: "Swimming" }, { value: "SPORTS", label: "Sports" },
    { value: "OTHER", label: "Other" },
  ], required: true },
  { key: "duration", label: "Duration (min)", type: "number", placeholder: "30", required: true },
  { key: "intensity", label: "Intensity", type: "select", options: [
    { value: "LOW", label: "Low" }, { value: "MODERATE", label: "Moderate" },
    { value: "HIGH", label: "High" }, { value: "VERY_HIGH", label: "Very High" },
  ], required: true },
  { key: "caloriesBurned", label: "Calories Burned", type: "number", placeholder: "300" },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Session notes..." },
];

export const COLLECTION_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name", label: "Item Name", type: "text", placeholder: "e.g. Kirito 1/7 Figure", required: true },
  { key: "category", label: "Category", type: "select", options: [
    { value: "FIGURE", label: "Figure" }, { value: "BOOK", label: "Book" },
    { value: "GAME", label: "Game" }, { value: "ART", label: "Art" },
    { value: "MUSIC", label: "Music" }, { value: "OTHER", label: "Other" },
  ], required: true },
  { key: "rarity", label: "Rarity", type: "select", options: [
    { value: "COMMON", label: "Common" }, { value: "UNCOMMON", label: "Uncommon" },
    { value: "RARE", label: "Rare" }, { value: "EPIC", label: "Epic" },
    { value: "LEGENDARY", label: "Legendary" },
  ], required: true },
  { key: "condition", label: "Condition", type: "select", options: [
    { value: "MINT", label: "Mint" }, { value: "EXCELLENT", label: "Excellent" },
    { value: "GOOD", label: "Good" }, { value: "FAIR", label: "Fair" },
    { value: "POOR", label: "Poor" },
  ], required: true },
  { key: "acquiredAt", label: "Acquired Date", type: "date", required: true },
  { key: "source", label: "Source", type: "text", placeholder: "e.g. Amazon JP" },
  { key: "notes", label: "Notes", type: "textarea", placeholder: "Notes..." },
];

export const MEDIA_FORM_FIELDS: FormFieldSpec[] = [
  { key: "type", label: "Type", type: "select", options: [
    { value: "ANIME", label: "Anime" }, { value: "BOOK", label: "Book" },
    { value: "MOVIE", label: "Movie" }, { value: "GAME", label: "Game" },
    { value: "SERIES", label: "Series" },
  ], required: true },
  { key: "title", label: "Title", type: "text", placeholder: "e.g. Sword Art Online", required: true },
  { key: "status", label: "Status", type: "select", options: [
    { value: "PLANNING", label: "Planning" }, { value: "WATCHING", label: "Watching/Reading" },
    { value: "COMPLETED", label: "Completed" }, { value: "DROPPED", label: "Dropped" },
  ], required: true },
  { key: "progress", label: "Progress (ep/pages)", type: "number", placeholder: "0" },
  { key: "totalEpisodes", label: "Total Episodes/Pages", type: "number", placeholder: "12" },
  { key: "rating", label: "Rating (1-10)", type: "number", placeholder: "8" },
];

export const PARTY_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name", label: "Party Name", type: "text", placeholder: "e.g. Frontline Assault", required: true },
  { key: "description", label: "Description", type: "textarea", placeholder: "Party description..." },
  { key: "maxMembers", label: "Max Members", type: "number", placeholder: "6", required: true },
  { key: "joinPolicy", label: "Join Policy", type: "select", options: [
    { value: "OPEN", label: "Open" }, { value: "APPROVAL", label: "Application" },
    { value: "INVITE_ONLY", label: "Invite Only" },
  ], required: true },
  { key: "tags", label: "Tags (comma-separated)", type: "text", placeholder: "PvE, Boss, Exploration" },
];

export const GUILD_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name", label: "Guild Name", type: "text", placeholder: "e.g. Knights of Aincrad", required: true },
  { key: "description", label: "Description", type: "textarea", placeholder: "Guild description..." },
  { key: "maxMembers", label: "Max Members", type: "number", placeholder: "50", required: true },
  { key: "joinPolicy", label: "Join Policy", type: "select", options: [
    { value: "OPEN", label: "Open" }, { value: "APPROVAL", label: "Application" },
    { value: "INVITE_ONLY", label: "Invite Only" },
  ], required: true },
  { key: "tags", label: "Tags (comma-separated)", type: "text", placeholder: "PvE, Boss, Crafting" },
];

export const LISTING_FORM_FIELDS: FormFieldSpec[] = [
  { key: "itemName", label: "Item Name", type: "text", placeholder: "e.g. Elucidator", required: true },
  { key: "price", label: "Price (col)", type: "number", placeholder: "10000", required: true },
  { key: "quantity", label: "Quantity", type: "number", placeholder: "1", required: true },
];

export const FRIEND_MEMO_FORM_FIELDS: FormFieldSpec[] = [
  { key: "hobbies", label: "취미", type: "text", placeholder: "예: 달리기, 독서, 게임" },
  { key: "favorites", label: "좋아하는 것", type: "text", placeholder: "예: 라멘, 애니, 고양이" },
  { key: "birthday", label: "생일", type: "date" },
  { key: "closeness", label: "친한 정도", type: "select", options: [
    { value: "지인", label: "지인" }, { value: "친구", label: "친구" },
    { value: "절친", label: "절친" }, { value: "소울메이트", label: "소울메이트" },
  ] },
  { key: "firstMet", label: "처음 만난 날", type: "date" },
  { key: "note", label: "한 줄 메모", type: "textarea", placeholder: "친구에 대한 메모..." },
];

// ─── System ──────────────────────────────────────────────────────────────────

export const SYSTEM_PANEL_ROWS: Record<
  Exclude<SystemSubId, "logout">,
  { description: string; rows: string[] }
> = {
  options: {
    description: "System settings for graphics, audio, notifications, and UI preferences.",
    rows: [
      "Graphics Quality: High",
      "Master Volume: 78%",
      "Notifications: Enabled",
      "Language: Korean",
      "UI Scale: 100%",
    ],
  },
  help: {
    description: "Help resources — quick start guide, FAQ, support, and patch notes.",
    rows: [
      "Quick Start Guide",
      "Frequently Asked Questions",
      "Contact Support",
      "Patch Notes",
      "Terms of Service & Safety",
    ],
  },
};
