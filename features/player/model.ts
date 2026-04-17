import type { PlayerSubId, PanelDataItem, PanelMenuItem, FormFieldSpec } from "@/entities/nav";
import { CRUD_ACTIONS, pad, dateAt } from "@/entities/nav";

// ─── Raw data ────────────────────────────────────────────────────────────────

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
    category: a.cat,
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
    category: c.cat,
    detailTitle: "Credential Detail",
    detailDescription: `${c.name} issued by ${c.issuer}.`,
    detailRows: [
      `Issuer: ${c.issuer}`,
      `Category: ${c.cat}`,
      `Acquired: ${dateAt(i)}`,
      c.expires ? `Expires: ${c.expires}` : `Expires: Never`,
    ],
    actions: CRUD_ACTIONS,
  })),
  title: TITLE_DATA.map((t, i) => ({
    id: `title-${pad(i + 1, 3)}`,
    label: t.name,
    slotLabel: t.code.slice(0, 2),
    subtitle: `${t.cat} | Acquired: ${dateAt(i)}`,
    category: t.cat,
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
    category: h.cat,
    detailTitle: "Interest Detail",
    detailDescription: `${h.name} — ${h.custom}`,
    detailRows: [
      `Category: ${h.cat}`,
      `Status: ${h.status}`,
      `Proficiency: ${h.proficiency}/100`,
      `XP: ${h.xp.toLocaleString()}`,
    ],
    actions: CRUD_ACTIONS,
  })),
};

// ─── Player category panels ───────────────────────────────────────────────────

function uniqueOrderedCats<T extends { cat: string }>(data: T[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of data) {
    if (!seen.has(item.cat)) { seen.add(item.cat); result.push(item.cat); }
  }
  return result;
}

function catMenuItems(cats: string[]): PanelMenuItem[] {
  return cats.map((cat) => ({ id: cat, label: cat, slotLabel: cat.slice(0, 2).toUpperCase() }));
}

export const PLAYER_CATEGORY_ITEMS: Record<PlayerSubId, PanelMenuItem[]> = {
  achievement: catMenuItems(uniqueOrderedCats(ACHIEVEMENT_DATA)),
  credentials: catMenuItems(uniqueOrderedCats(CERTIFICATION_DATA)),
  title:       catMenuItems(uniqueOrderedCats(TITLE_DATA)),
  interests:   catMenuItems(uniqueOrderedCats(HOBBY_DATA)),
};

// ─── Form Fields ─────────────────────────────────────────────────────────────

export const CERTIFICATION_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name",         label: "Name",          type: "text",   placeholder: "e.g. AWS Solutions Architect", required: true },
  { key: "issuer",       label: "Issuer",         type: "text",   placeholder: "e.g. Amazon Web Services",    required: true },
  { key: "category",     label: "Category",       type: "select", required: true, options: [
    { value: "Cloud",       label: "Cloud" },
    { value: "Programming", label: "Programming" },
    { value: "DevOps",      label: "DevOps" },
    { value: "Language",    label: "Language" },
    { value: "Academic",    label: "Academic" },
    { value: "Database",    label: "Database" },
    { value: "Security",    label: "Security" },
    { value: "Frontend",    label: "Frontend" },
    { value: "Other",       label: "Other" },
  ]},
  { key: "acquiredDate", label: "Acquired Date", type: "date",   required: true },
  { key: "expiresDate",  label: "Expires Date",  type: "date" },
];

export const HOBBY_FORM_FIELDS: FormFieldSpec[] = [
  { key: "customName",   label: "Display Name", type: "text",   placeholder: "e.g. Full-Stack Dev",   required: true },
  { key: "category",     label: "Category",     type: "select", required: true, options: [
    { value: "Tech",          label: "Tech" },
    { value: "Learning",      label: "Learning" },
    { value: "Entertainment", label: "Entertainment" },
    { value: "Fitness",       label: "Fitness" },
    { value: "Art",           label: "Art" },
    { value: "Music",         label: "Music" },
    { value: "Wellness",      label: "Wellness" },
    { value: "Other",         label: "Other" },
  ]},
  { key: "detail",       label: "Detail",       type: "textarea", placeholder: "What exactly do you do?" },
  { key: "proficiency",  label: "Proficiency (0–100)", type: "number", placeholder: "50" },
  { key: "status",       label: "Status",       type: "select", required: true, options: [
    { value: "ACTIVE",   label: "Active" },
    { value: "ON_HOLD",  label: "On Hold" },
    { value: "INACTIVE", label: "Inactive" },
  ]},
  { key: "startedOn",    label: "Started Date", type: "date" },
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
