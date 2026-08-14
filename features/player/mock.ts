import type {
  CharacterSheet,
  CertificationCatalogInfo,
  HobbyCatalogInfo,
  PlayerAchievementInfo,
  PlayerCertificationDatesRequest,
  PlayerCertificationInfo,
  PlayerCertificationMutationResult,
  PlayerHobbyInfo,
  PlayerHobbyMutationRequest,
  PlayerHobbyMutationResult,
  PlayerInfo,
  PlayerTitleInfo,
} from "@/shared/api/types";

export const MOCK_CHARACTER_SHEET: CharacterSheet = {
  player: {
    playerId: 6,
    name: "Ryu",
    gender: "MALE",
    job: "Swordsman",
    level: 78,
    exp: 7842,
    currentHealth: 8420,
    healthCapacity: 9200,
    currentMana: 3100,
    manaCapacity: 4000,
    str: 342,
    agi: 287,
    dex: 256,
    intel: 145,
    vit: 310,
    luc: 89,
    extraStats: {
      "Critical Rate": 24,
      "Dodge Rate": 18,
      "Movement Speed": 112,
    },
    effects: [
      { code: "DUAL_WIELD_BONUS", effect: "Attack Speed +1.80" },
      { code: "SOLO_BUFF", effect: "EXP Gain +15%" },
    ],
    representativeTitleId: 1,
  },
  title: {
    titleId: 1,
    code: "BLACK_SWORDSMAN",
    name: "Black Swordsman",
    category: "Achievement",
  },
  equipments: [
    {
      slotId: 1,
      slotCode: "MAIN_HAND",
      slotName: "Main Hand",
      slotCategory: "Weapon",
      slotRole: "primary",
      itemInstanceId: 101,
    },
    {
      slotId: 2,
      slotCode: "OFF_HAND",
      slotName: "Off Hand",
      slotCategory: "Weapon",
      slotRole: "secondary",
      itemInstanceId: 102,
    },
    {
      slotId: 3,
      slotCode: "BODY_ARMOR",
      slotName: "Body Armor",
      slotCategory: "Armor",
      slotRole: "primary",
      itemInstanceId: 201,
    },
    {
      slotId: 4,
      slotCode: "BOOTS",
      slotName: "Boots",
      slotCategory: "Boots",
      slotRole: "primary",
      itemInstanceId: 301,
    },
  ],
  representativeGuildName: "Knights of Blood Oath",
};

export interface MockEquippedItem {
  code: string;
  name: string;
  category: string;
  role: string;
  equippedAt: string;
}

export const MOCK_EQUIPPED_ITEMS: Record<number, MockEquippedItem> = {
  101: { code: "ELUCIDATOR",     name: "Elucidator",         category: "Weapon", role: "Sword",       equippedAt: "2026-01-05" },
  102: { code: "DARK_REPULSER",  name: "Dark Repulser",      category: "Weapon", role: "Sword",       equippedAt: "2026-02-20" },
  201: { code: "WIND_FLEURET",   name: "Wind Fleuret Armor", category: "Armor",  role: "Light Armor", equippedAt: "2026-01-15" },
  301: { code: "SHADOW_BOOTS",   name: "Shadow Boots",       category: "Boots",  role: "Light",       equippedAt: "2026-01-20" },
};

export const MOCK_ACHIEVEMENTS: PlayerAchievementInfo[] = [
  { achievementId: 1, code: "FIRST_BLOOD", name: "First Blood", category: "Combat", descMd: "Defeated your first monster.", acquiredAt: "2026-01-05T10:00:00Z" },
  { achievementId: 2, code: "FLOOR_BOSS", name: "Floor Boss Slayer", category: "Combat", descMd: "Defeated a floor boss for the first time.", acquiredAt: "2026-01-12T14:30:00Z" },
  { achievementId: 3, code: "SOLO_RUN", name: "Solo Runner", category: "Exploration", descMd: "Cleared a dungeon entirely solo.", acquiredAt: "2026-01-18T09:15:00Z" },
  { achievementId: 4, code: "SPEED_RUN", name: "Speedrunner", category: "Completion", descMd: "Cleared a floor in record time.", acquiredAt: "2026-01-25T16:45:00Z" },
  { achievementId: 5, code: "BLACKSMITH_1", name: "Blacksmith Apprentice", category: "Crafting", descMd: "Crafted your first item.", acquiredAt: "2026-02-01T11:00:00Z" },
  { achievementId: 6, code: "DUAL_WIELD", name: "Dual Wield Mastery", category: "Combat", descMd: "Unlocked the rare Dual Wield skill.", acquiredAt: "2026-02-08T20:30:00Z" },
  { achievementId: 7, code: "PERFECT_GUARD", name: "Perfect Guard", category: "Defense", descMd: "Blocked 100 attacks with perfect timing.", acquiredAt: "2026-02-14T13:00:00Z" },
  { achievementId: 8, code: "MONSTER_HUNT", name: "Monster Hunter", category: "Combat", descMd: "Defeated 1000 monsters.", acquiredAt: "2026-02-18T08:00:00Z" },
  { achievementId: 9, code: "TREASURE_HUNT", name: "Treasure Hunter", category: "Exploration", descMd: "Discovered 50 hidden treasure rooms.", acquiredAt: "2026-02-22T15:20:00Z" },
  { achievementId: 10, code: "BEATER", name: "The Beater", category: "Special", descMd: "Recognized as a beta tester by other players.", acquiredAt: "2026-01-10T07:00:00Z" },
  { achievementId: 11, code: "GUILD_FOUNDER", name: "Guild Founder", category: "Social", descMd: "Founded your first guild.", acquiredAt: "2026-02-25T19:00:00Z" },
  { achievementId: 12, code: "MARKET_MASTER", name: "Market Master", category: "Economy", descMd: "Completed 100 market trades.", acquiredAt: "2026-03-01T10:30:00Z" },
  { achievementId: 13, code: "LEVEL_50", name: "Level 50 Milestone", category: "Growth", descMd: "Reached character level 50.", acquiredAt: "2026-02-10T17:45:00Z" },
  { achievementId: 14, code: "ENCHANT_MASTER", name: "Enchantment Master", category: "Crafting", descMd: "Successfully enchanted 50 items.", acquiredAt: "2026-02-20T14:00:00Z" },
  { achievementId: 15, code: "NIGHT_RUNNER", name: "Night Runner", category: "Exploration", descMd: "Explored 10 dungeons at night time.", acquiredAt: "2026-02-28T23:00:00Z" },
  { achievementId: 16, code: "PARTY_LEADER", name: "Party Leader", category: "Social", descMd: "Led a party to clear a boss without casualties.", acquiredAt: "2026-03-02T12:00:00Z" },
  { achievementId: 17, code: "RARE_ITEM", name: "Rare Collector", category: "Collection", descMd: "Obtained 20 rare-tier or above items.", acquiredAt: "2026-02-15T16:30:00Z" },
  { achievementId: 18, code: "LEGENDARY_KILL", name: "Legend Slayer", category: "Combat", descMd: "Defeated a legendary-tier monster.", acquiredAt: "2026-03-01T21:00:00Z" },
];

function copy<T>(value: T): T {
  return structuredClone(value);
}

export const achievementMock = {
  list: (): PlayerAchievementInfo[] => copy(MOCK_ACHIEVEMENTS),
  detail: (achievementId: number): PlayerAchievementInfo => {
    const found = MOCK_ACHIEVEMENTS.find((achievement) => achievement.achievementId === achievementId);
    if (!found) throw new Error("Acquired Achievement not found.");
    return copy(found);
  },
};

export const MOCK_CERTIFICATION_CATALOG = [
  { certificationId: 1, name: "AWS Solutions Architect", issuer: "Amazon Web Services", category: "Cloud" },
  { certificationId: 2, name: "Python Professional", issuer: "Python Institute", category: "Programming" },
  { certificationId: 3, name: "Kubernetes Administrator", issuer: "CNCF", category: "DevOps" },
  { certificationId: 4, name: "TOEIC 935", issuer: "ETS Korea", category: "Language" },
] satisfies CertificationCatalogInfo[];

export const MOCK_PLAYER_CERTIFICATIONS = [
  { ...MOCK_CERTIFICATION_CATALOG[0], acquiredDate: "2025-06-15", expiresDate: "2028-06-15", grantedAt: "2025-06-15T09:00:00Z" },
  { ...MOCK_CERTIFICATION_CATALOG[1], acquiredDate: null, expiresDate: null, grantedAt: "2025-03-20T10:00:00Z" },
] satisfies PlayerCertificationInfo[];

let playerCertifications: PlayerCertificationInfo[] = copy(MOCK_PLAYER_CERTIFICATIONS);

function validateDates(acquiredDate: string | null, expiresDate: string | null): void {
  if (acquiredDate && expiresDate && expiresDate < acquiredDate) throw new Error("Expiration date cannot be before acquired date.");
}

export function resetCertificationMock(): void {
  playerCertifications = copy(MOCK_PLAYER_CERTIFICATIONS);
}

export const certificationMock = {
  catalog: (): CertificationCatalogInfo[] => copy(MOCK_CERTIFICATION_CATALOG),
  owned: (): PlayerCertificationInfo[] => copy(playerCertifications),
  register: (certificationId: number, body: PlayerCertificationDatesRequest): PlayerCertificationMutationResult => {
    if (playerCertifications.some((item) => item.certificationId === certificationId)) throw new Error("Certification already registered.");
    const catalog = MOCK_CERTIFICATION_CATALOG.find((item) => item.certificationId === certificationId);
    if (!catalog) throw new Error("Certification not found.");
    const acquiredDate = body.acquiredDate ?? null;
    const expiresDate = body.expiresDate ?? null;
    validateDates(acquiredDate, expiresDate);
    playerCertifications.push({ ...catalog, acquiredDate, expiresDate, grantedAt: "2026-08-14T00:00:00Z" });
    return { certificationId, acquiredDate, expiresDate };
  },
  update: (certificationId: number, body: PlayerCertificationDatesRequest): PlayerCertificationMutationResult => {
    const current = playerCertifications.find((item) => item.certificationId === certificationId);
    if (!current) throw new Error("Player Certification not found.");
    const acquiredDate = body.acquiredDate ?? current.acquiredDate;
    const expiresDate = body.expiresDate ?? current.expiresDate;
    validateDates(acquiredDate, expiresDate);
    const updated = { ...current, acquiredDate, expiresDate };
    playerCertifications = playerCertifications.map((item) => item.certificationId === certificationId ? updated : item);
    return { certificationId, acquiredDate, expiresDate };
  },
  delete: (certificationId: number): number => {
    if (!playerCertifications.some((item) => item.certificationId === certificationId)) throw new Error("Player Certification not found.");
    playerCertifications = playerCertifications.filter((item) => item.certificationId !== certificationId);
    return certificationId;
  },
};

export const MOCK_TITLES: PlayerTitleInfo[] = [
  { titleId: 1, code: "BLACK_SWORDSMAN", name: "Black Swordsman", category: "Achievement", descMd: "The legendary solo player known for his black equipment.", acquiredAt: "2026-02-08T20:30:00Z" },
  { titleId: 2, code: "BEATER", name: "Beater", category: "Special", descMd: "A beta tester who used prior knowledge to gain an advantage.", acquiredAt: "2026-01-10T07:00:00Z" },
  { titleId: 3, code: "SOLO_KING", name: "Solo King", category: "Exploration", descMd: "Cleared 10 floors completely solo.", acquiredAt: "2026-02-18T15:00:00Z" },
  { titleId: 4, code: "FLOOR_CLEARER", name: "Floor Clearer", category: "Combat", descMd: "Participated in clearing the frontline floors.", acquiredAt: "2026-01-25T16:00:00Z" },
  { titleId: 5, code: "DUAL_WIELDER", name: "Dual Wielder", category: "Combat", descMd: "Holder of the unique Dual Wield skill.", acquiredAt: "2026-02-08T20:30:00Z" },
  { titleId: 6, code: "MASTER_CRAFTER", name: "Master Crafter", category: "Crafting", descMd: "Crafted items rated as masterwork quality.", acquiredAt: "2026-02-20T14:00:00Z" },
  { titleId: 7, code: "GUILD_CHIEF", name: "Guild Chief", category: "Social", descMd: "Leader of a recognized guild.", acquiredAt: "2026-02-25T19:00:00Z" },
  { titleId: 8, code: "LEGEND_SLAYER", name: "Legend Slayer", category: "Combat", descMd: "Slayer of legendary-tier monsters.", acquiredAt: "2026-03-01T21:00:00Z" },
  { titleId: 9, code: "MARKET_KING", name: "Market King", category: "Economy", descMd: "Completed 100 market trades with perfect ratings.", acquiredAt: "2026-03-01T10:30:00Z" },
  { titleId: 10, code: "NIGHT_WALKER", name: "Night Walker", category: "Exploration", descMd: "Master of nocturnal dungeon exploration.", acquiredAt: "2026-02-28T23:00:00Z" },
  { titleId: 11, code: "FRONTLINER", name: "Frontliner", category: "Rank", descMd: "Active member of the front-line clearing team.", acquiredAt: "2026-01-20T12:00:00Z" },
  { titleId: 12, code: "RARE_HUNTER", name: "Rare Hunter", category: "Collection", descMd: "Collector of rare and legendary items.", acquiredAt: "2026-02-15T16:30:00Z" },
];

const MOCK_CURRENT_PLAYER: PlayerInfo = copy(MOCK_CHARACTER_SHEET.player);
let currentPlayer: PlayerInfo = copy(MOCK_CURRENT_PLAYER);

export function resetTitleMock(): void {
  currentPlayer = copy(MOCK_CURRENT_PLAYER);
}

export const titleMock = {
  player: (): PlayerInfo => copy(currentPlayer),
  titles: (): PlayerTitleInfo[] => copy(MOCK_TITLES),
  setRepresentative: (titleId: number): { titleId: number } => {
    if (!MOCK_TITLES.some((title) => title.titleId === titleId)) throw new Error("Acquired Title not found.");
    currentPlayer = { ...currentPlayer, representativeTitleId: titleId };
    return { titleId };
  },
};

export const MOCK_HOBBY_CATALOG = [
  { hobbyId: 1, name: "Programming", category: "Tech" },
  { hobbyId: 2, name: "Reading", category: "Learning" },
  { hobbyId: 3, name: "Running", category: "Fitness" },
  { hobbyId: 4, name: "Drawing", category: "Art" },
] satisfies HobbyCatalogInfo[];

export const MOCK_PLAYER_HOBBIES = [
  { ...MOCK_HOBBY_CATALOG[0], customName: "Full-Stack Dev", detail: "Next.js and Spring Boot", proficiency: 85, status: "ACTIVE", startedOn: "2020-03-01", xp: 42000 },
  { ...MOCK_HOBBY_CATALOG[1], customName: "Reading", detail: null, proficiency: 72, status: "PAUSED", startedOn: null, xp: 28500 },
] satisfies PlayerHobbyInfo[];

let playerHobbies: PlayerHobbyInfo[] = copy(MOCK_PLAYER_HOBBIES);

function validateHobby(body: PlayerHobbyMutationRequest): void {
  if (body.proficiency !== undefined && (!Number.isInteger(body.proficiency) || body.proficiency < 0 || body.proficiency > 100)) throw new Error("Proficiency must be between 0 and 100.");
}

function hobbyResult(item: PlayerHobbyInfo): PlayerHobbyMutationResult {
  return { hobbyId: item.hobbyId, customName: item.customName, detail: item.detail, proficiency: item.proficiency, status: item.status, startedOn: item.startedOn, xp: item.xp };
}

export function resetHobbyMock(): void {
  playerHobbies = copy(MOCK_PLAYER_HOBBIES);
}

export const hobbyMock = {
  catalog: (): HobbyCatalogInfo[] => copy(MOCK_HOBBY_CATALOG),
  owned: (): PlayerHobbyInfo[] => copy(playerHobbies),
  register: (hobbyId: number, body: PlayerHobbyMutationRequest): PlayerHobbyMutationResult => {
    if (playerHobbies.some((item) => item.hobbyId === hobbyId)) throw new Error("Hobby already registered.");
    const catalog = MOCK_HOBBY_CATALOG.find((item) => item.hobbyId === hobbyId);
    if (!catalog) throw new Error("Hobby not found.");
    if (!body.customName || body.proficiency === undefined || !body.status) throw new Error("customName, proficiency, and status are required.");
    validateHobby(body);
    const created: PlayerHobbyInfo = { ...catalog, customName: body.customName, detail: body.detail ?? null, proficiency: body.proficiency, status: body.status, startedOn: body.startedOn ?? null, xp: 0 };
    playerHobbies.push(created);
    return hobbyResult(created);
  },
  update: (hobbyId: number, body: PlayerHobbyMutationRequest): PlayerHobbyMutationResult => {
    const current = playerHobbies.find((item) => item.hobbyId === hobbyId);
    if (!current) throw new Error("Player Hobby not found.");
    validateHobby(body);
    const updated = { ...current, ...Object.fromEntries(Object.entries(body).filter(([, value]) => value !== null && value !== undefined)) } as PlayerHobbyInfo;
    playerHobbies = playerHobbies.map((item) => item.hobbyId === hobbyId ? updated : item);
    return hobbyResult(updated);
  },
  delete: (hobbyId: number): number => {
    if (!playerHobbies.some((item) => item.hobbyId === hobbyId)) throw new Error("Player Hobby not found.");
    playerHobbies = playerHobbies.filter((item) => item.hobbyId !== hobbyId);
    return hobbyId;
  },
};
