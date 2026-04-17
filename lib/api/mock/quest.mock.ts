import type { QuestAcceptance, QuestBlueprint } from "../types";

export const MOCK_DAILY_BLUEPRINTS: QuestBlueprint[] = [
  { code: "DAILY_EXP_001", title: "Morning Grind", category: "Daily", descriptionMd: "Defeat 20 monsters to earn daily bonus EXP.", targetType: "KILL_COUNT", targetValue: 20, repeatRule: "DAILY", rewardExp: 1200, rewardStats: { str: 1 }, dueAt: "2026-03-02T23:59:59Z" },
  { code: "DAILY_CRAFT_001", title: "Daily Crafting", category: "Daily", descriptionMd: "Craft 3 items of any type today.", targetType: "CRAFT_COUNT", targetValue: 3, repeatRule: "DAILY", rewardExp: 800, rewardStats: { dex: 1 }, dueAt: "2026-03-02T23:59:59Z" },
  { code: "DAILY_EXER_001", title: "Exercise Log", category: "Daily", descriptionMd: "Log at least 30 minutes of exercise.", targetType: "EXERCISE_MINUTES", targetValue: 30, repeatRule: "DAILY", rewardExp: 600, rewardStats: { vit: 1 }, dueAt: "2026-03-02T23:59:59Z" },
  { code: "DAILY_READ_001", title: "Reading Time", category: "Daily", descriptionMd: "Read for at least 20 minutes.", targetType: "READ_MINUTES", targetValue: 20, repeatRule: "DAILY", rewardExp: 500, rewardStats: { intel: 1 }, dueAt: "2026-03-02T23:59:59Z" },
  { code: "DAILY_MARKET_001", title: "Market Visit", category: "Daily", descriptionMd: "Complete 1 market transaction.", targetType: "TRADE_COUNT", targetValue: 1, repeatRule: "DAILY", rewardExp: 400, rewardStats: { luc: 1 }, dueAt: "2026-03-02T23:59:59Z" },
  { code: "DAILY_SOCIAL_001", title: "Social Interaction", category: "Daily", descriptionMd: "Send a message to 2 friends.", targetType: "MESSAGE_COUNT", targetValue: 2, repeatRule: "DAILY", rewardExp: 300, rewardStats: {}, dueAt: "2026-03-02T23:59:59Z" },
];

export const MOCK_SUGGESTED_BLUEPRINTS: QuestBlueprint[] = [
  { code: "SUGGEST_DUNG_001", title: "Dark Forest Dungeon", category: "Dungeon", descriptionMd: "Clear the Dark Forest dungeon on Floor 35.", targetType: "BOSS_KILL", targetValue: 1, repeatRule: "NONE", rewardExp: 5000, rewardStats: { str: 3, agi: 2 }, dueAt: "2026-03-15T23:59:59Z" },
  { code: "SUGGEST_CRAFT_002", title: "Forge a Rare Weapon", category: "Crafting", descriptionMd: "Craft a weapon rated Rare or above.", targetType: "CRAFT_RARITY", targetValue: 3, repeatRule: "NONE", rewardExp: 3000, rewardStats: { dex: 2 }, dueAt: "2026-03-20T23:59:59Z" },
  { code: "SUGGEST_LVL_001", title: "Reach Level 80", category: "Growth", descriptionMd: "Reach character level 80.", targetType: "LEVEL", targetValue: 80, repeatRule: "NONE", rewardExp: 10000, rewardStats: { str: 5, vit: 5, agi: 5 }, dueAt: null },
  { code: "SUGGEST_SOCIAL_002", title: "Join a Guild", category: "Social", descriptionMd: "Become a member of any guild.", targetType: "JOIN_GUILD", targetValue: 1, repeatRule: "NONE", rewardExp: 2000, rewardStats: {}, dueAt: "2026-03-31T23:59:59Z" },
  { code: "SUGGEST_COLL_001", title: "Rare Item Hunter", category: "Collection", descriptionMd: "Collect 5 Epic-tier items.", targetType: "ITEM_RARITY_COUNT", targetValue: 5, repeatRule: "NONE", rewardExp: 4000, rewardStats: { luc: 3 }, dueAt: null },
];

export const MOCK_STORY_ACCEPTANCES: QuestAcceptance[] = [
  { id: 1, questId: 101, code: "STORY_FL01_001", title: "The Beginning", category: "Story", descriptionMd: "Escape the Starting City and begin your journey.", targetType: "ZONE_CLEAR", targetValue: 1, progress: 1, status: "COMPLETED", repeatRule: "NONE", periodStart: "2026-01-01", periodEnd: null, completedAt: "2026-01-05T12:00:00Z", dueAt: null },
  { id: 2, questId: 102, code: "STORY_FL05_001", title: "Blazing Colossus", category: "Story", descriptionMd: "Defeat Biceps Archelon, the boss of Floor 5.", targetType: "BOSS_KILL", targetValue: 1, progress: 1, status: "COMPLETED", repeatRule: "NONE", periodStart: "2026-01-12", periodEnd: null, completedAt: "2026-01-15T18:30:00Z", dueAt: null },
  { id: 3, questId: 103, code: "STORY_FL10_001", title: "The Gleam Eyes", category: "Story", descriptionMd: "Confront and defeat the Gleam Eyes on Floor 10.", targetType: "BOSS_KILL", targetValue: 1, progress: 1, status: "COMPLETED", repeatRule: "NONE", periodStart: "2026-01-20", periodEnd: null, completedAt: "2026-01-28T22:00:00Z", dueAt: null },
  { id: 4, questId: 104, code: "STORY_FL25_001", title: "Into the Labyrinth", category: "Story", descriptionMd: "Reach and map the Floor 25 Labyrinth.", targetType: "EXPLORE", targetValue: 100, progress: 78, status: "IN_PROGRESS", repeatRule: "NONE", periodStart: "2026-02-01", periodEnd: null, completedAt: null, dueAt: null },
  { id: 5, questId: 105, code: "STORY_FL25_002", title: "The Black Iron Palace", category: "Story", descriptionMd: "Defeat the Floor 25 boss in the Black Iron Palace.", targetType: "BOSS_KILL", targetValue: 1, progress: 0, status: "PENDING", repeatRule: "NONE", periodStart: null, periodEnd: null, completedAt: null, dueAt: null },
  { id: 6, questId: 106, code: "STORY_DUAL_001", title: "The Dual Blades", category: "Story", descriptionMd: "Master the art of the dual-wielding style.", targetType: "SKILL_MASTERY", targetValue: 100, progress: 62, status: "IN_PROGRESS", repeatRule: "NONE", periodStart: "2026-02-10", periodEnd: null, completedAt: null, dueAt: null },
];

export const MOCK_PARTY_QUEST_ACCEPTANCES: QuestAcceptance[] = [
  { id: 10, questId: 201, code: "PARTY_DUNG_001", title: "Haunted Keep Raid", category: "Party", descriptionMd: "Clear the Haunted Keep dungeon as a party.", targetType: "BOSS_KILL", targetValue: 1, progress: 0, status: "PENDING", repeatRule: "NONE", periodStart: "2026-03-01", periodEnd: "2026-03-10", completedAt: null, dueAt: "2026-03-10T23:59:59Z" },
  { id: 11, questId: 202, code: "PARTY_KILL_001", title: "Monster Purge", category: "Party", descriptionMd: "Defeat 200 monsters as a party in Floor 30.", targetType: "KILL_COUNT", targetValue: 200, progress: 87, status: "IN_PROGRESS", repeatRule: "NONE", periodStart: "2026-02-25", periodEnd: "2026-03-05", completedAt: null, dueAt: "2026-03-05T23:59:59Z" },
  { id: 12, questId: 203, code: "PARTY_BOSS_001", title: "Dark Knight Challenge", category: "Party", descriptionMd: "Defeat the elite Dark Knight without any party member falling.", targetType: "BOSS_KILL", targetValue: 1, progress: 1, status: "COMPLETED", repeatRule: "NONE", periodStart: "2026-02-20", periodEnd: null, completedAt: "2026-02-22T16:00:00Z", dueAt: null },
];

export const MOCK_GUILD_QUEST_ACCEPTANCES: QuestAcceptance[] = [
  { id: 20, questId: 301, code: "GUILD_CONQ_001", title: "Guild Territory Conquest", category: "Guild", descriptionMd: "Conquer and hold a guild territory for 48 hours.", targetType: "TERRITORY_HOLD", targetValue: 48, progress: 24, status: "IN_PROGRESS", repeatRule: "NONE", periodStart: "2026-03-01", periodEnd: "2026-03-03", completedAt: null, dueAt: "2026-03-03T23:59:59Z" },
  { id: 21, questId: 302, code: "GUILD_CRAFT_001", title: "Guild Forge Event", category: "Guild", descriptionMd: "Craft 100 items collectively as a guild within a week.", targetType: "CRAFT_COUNT", targetValue: 100, progress: 43, status: "IN_PROGRESS", repeatRule: "NONE", periodStart: "2026-02-28", periodEnd: "2026-03-06", completedAt: null, dueAt: "2026-03-06T23:59:59Z" },
  { id: 22, questId: 303, code: "GUILD_MARKET_001", title: "Guild Market Domination", category: "Guild", descriptionMd: "Complete 500 guild market transactions in a month.", targetType: "TRADE_COUNT", targetValue: 500, progress: 312, status: "IN_PROGRESS", repeatRule: "MONTHLY", periodStart: "2026-03-01", periodEnd: "2026-03-31", completedAt: null, dueAt: "2026-03-31T23:59:59Z" },
];
