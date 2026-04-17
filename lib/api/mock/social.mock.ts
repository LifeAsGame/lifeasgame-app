import type { FollowSummary, GuildInfo, PartyInfo } from "../types";

export const MOCK_PARTIES: PartyInfo[] = [
  { id: 1, playerId: 6, name: "Frontline Assault", code: "FLA-001", visibility: "PUBLIC", joinPolicy: "OPEN", status: "ACTIVE", maxMembers: 6, tags: ["PvE", "Boss", "Frontline"], descriptionMd: "Elite frontline clearing team. Floor 25+ specialists.", emblemImageUrl: null, emblemBgColor: "#1a1a2e", leaderPlayerId: 6, createdAt: "2026-01-15T10:00:00Z", updatedAt: "2026-03-01T12:00:00Z" },
  { id: 2, playerId: 12, name: "Night Raiders", code: "NRD-002", visibility: "PUBLIC", joinPolicy: "APPLICATION", status: "ACTIVE", maxMembers: 4, tags: ["Stealth", "Night", "Dungeon"], descriptionMd: "Nocturnal dungeon specialists. Night-time bonuses maximized.", emblemImageUrl: null, emblemBgColor: "#0d0d1a", leaderPlayerId: 12, createdAt: "2026-01-20T18:00:00Z", updatedAt: "2026-02-28T20:00:00Z" },
  { id: 3, playerId: 8, name: "Market Syndicate", code: "MKS-003", visibility: "PRIVATE", joinPolicy: "INVITE_ONLY", status: "ACTIVE", maxMembers: 3, tags: ["Economy", "Trade", "Crafting"], descriptionMd: "Trading and economic optimization team.", emblemImageUrl: null, emblemBgColor: "#2a1a00", leaderPlayerId: 8, createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-25T11:00:00Z" },
  { id: 4, playerId: 24, name: "Skill Hunters", code: "SKH-004", visibility: "PUBLIC", joinPolicy: "OPEN", status: "ACTIVE", maxMembers: 6, tags: ["Skills", "Grind", "EXP"], descriptionMd: "EXP and skill grinding optimization party.", emblemImageUrl: null, emblemBgColor: "#1a2a0d", leaderPlayerId: 24, createdAt: "2026-02-10T14:00:00Z", updatedAt: "2026-03-01T09:00:00Z" },
  { id: 5, playerId: 31, name: "The Wanderers", code: "WND-005", visibility: "PUBLIC", joinPolicy: "OPEN", status: "ACTIVE", maxMembers: 5, tags: ["Exploration", "Map", "Discovery"], descriptionMd: "Dedicated mappers and explorers.", emblemImageUrl: null, emblemBgColor: "#001a2a", leaderPlayerId: 31, createdAt: "2026-01-25T16:00:00Z", updatedAt: "2026-02-20T15:00:00Z" },
  { id: 6, playerId: 45, name: "Crafters Union", code: "CRU-006", visibility: "PUBLIC", joinPolicy: "APPLICATION", status: "ACTIVE", maxMembers: 8, tags: ["Crafting", "Materials", "Forge"], descriptionMd: "Artisan crafters focused on high-quality equipment.", emblemImageUrl: null, emblemBgColor: "#2a0a00", leaderPlayerId: 45, createdAt: "2026-02-05T11:00:00Z", updatedAt: "2026-03-02T08:00:00Z" },
  { id: 7, playerId: 57, name: "Solo Support", code: "SSP-007", visibility: "PUBLIC", joinPolicy: "OPEN", status: "FORMING", maxMembers: 2, tags: ["Support", "Casual", "Flexible"], descriptionMd: "Support build mains looking for flexible duo partners.", emblemImageUrl: null, emblemBgColor: "#1a0a2a", leaderPlayerId: 57, createdAt: "2026-03-01T17:00:00Z", updatedAt: "2026-03-02T10:00:00Z" },
  { id: 8, playerId: 63, name: "Dragon Slayers", code: "DRS-008", visibility: "PUBLIC", joinPolicy: "APPLICATION", status: "ACTIVE", maxMembers: 6, tags: ["Boss", "Dragon", "Elite"], descriptionMd: "Specializing in dragon-type boss encounters.", emblemImageUrl: null, emblemBgColor: "#2a0000", leaderPlayerId: 63, createdAt: "2026-01-30T13:00:00Z", updatedAt: "2026-02-28T19:00:00Z" },
];

export const MOCK_GUILDS: GuildInfo[] = [
  { id: 1, playerId: 6, name: "Knights of Aincrad", code: "KOA-001", visibility: "PUBLIC", joinPolicy: "APPLICATION", status: "ACTIVE", maxMembers: 50, tags: ["PvE", "Frontline", "Elite"], descriptionMd: "The premier frontline guild of Aincrad. Honor and strength above all.", emblemImageUrl: null, emblemBgColor: "#1a1a3a", leaderPlayerId: 6, createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-03-01T12:00:00Z" },
  { id: 2, playerId: 15, name: "Thunder Wolves", code: "TWL-002", visibility: "PUBLIC", joinPolicy: "APPLICATION", status: "ACTIVE", maxMembers: 30, tags: ["PvP", "Combat", "Competitive"], descriptionMd: "Competitive PvP guild. We dominate the arenas.", emblemImageUrl: null, emblemBgColor: "#2a1a00", leaderPlayerId: 15, createdAt: "2026-01-18T15:00:00Z", updatedAt: "2026-02-28T18:00:00Z" },
  { id: 3, playerId: 22, name: "Merchant Lords", code: "MCL-003", visibility: "PUBLIC", joinPolicy: "INVITE_ONLY", status: "ACTIVE", maxMembers: 20, tags: ["Trade", "Economy", "Market"], descriptionMd: "The economic powerhouse of Aincrad. Master traders.", emblemImageUrl: null, emblemBgColor: "#2a2000", leaderPlayerId: 22, createdAt: "2026-01-22T11:00:00Z", updatedAt: "2026-03-02T09:00:00Z" },
  { id: 4, playerId: 38, name: "Phantom Blades", code: "PHB-004", visibility: "PRIVATE", joinPolicy: "INVITE_ONLY", status: "ACTIVE", maxMembers: 15, tags: ["Stealth", "Assassin", "Solo"], descriptionMd: "Shadow operatives. We work in the dark.", emblemImageUrl: null, emblemBgColor: "#0a0a0a", leaderPlayerId: 38, createdAt: "2026-02-05T22:00:00Z", updatedAt: "2026-02-25T21:00:00Z" },
  { id: 5, playerId: 50, name: "Eternal Crafters", code: "ETC-005", visibility: "PUBLIC", joinPolicy: "OPEN", status: "ACTIVE", maxMembers: 40, tags: ["Crafting", "Materials", "Support"], descriptionMd: "The crafting backbone of Aincrad. Any item, any quality.", emblemImageUrl: null, emblemBgColor: "#1a2a00", leaderPlayerId: 50, createdAt: "2026-01-28T10:00:00Z", updatedAt: "2026-03-01T14:00:00Z" },
  { id: 6, playerId: 67, name: "Seekers of Lore", code: "SOL-006", visibility: "PUBLIC", joinPolicy: "APPLICATION", status: "ACTIVE", maxMembers: 25, tags: ["Lore", "Exploration", "Research"], descriptionMd: "Dedicated to uncovering the secrets of Aincrad.", emblemImageUrl: null, emblemBgColor: "#001a2a", leaderPlayerId: 67, createdAt: "2026-02-12T13:00:00Z", updatedAt: "2026-02-28T16:00:00Z" },
];

export const MOCK_FOLLOWS: FollowSummary[] = [
  { id: 1, playerId: 6, targetPlayerId: 7, state: "FOLLOWING", muted: false, blocked: false },
  { id: 2, playerId: 6, targetPlayerId: 13, state: "FOLLOWING", muted: false, blocked: false },
  { id: 3, playerId: 6, targetPlayerId: 21, state: "FOLLOWING", muted: true, blocked: false },
  { id: 4, playerId: 6, targetPlayerId: 34, state: "FOLLOWING", muted: false, blocked: false },
  { id: 5, playerId: 6, targetPlayerId: 42, state: "FOLLOWING", muted: false, blocked: false },
  { id: 6, playerId: 6, targetPlayerId: 55, state: "FOLLOWING", muted: false, blocked: false },
  { id: 7, playerId: 6, targetPlayerId: 68, state: "FOLLOWING", muted: false, blocked: true },
  { id: 8, playerId: 6, targetPlayerId: 74, state: "FOLLOWING", muted: false, blocked: false },
  { id: 9, playerId: 6, targetPlayerId: 89, state: "FOLLOWING", muted: false, blocked: false },
  { id: 10, playerId: 6, targetPlayerId: 93, state: "FOLLOWING", muted: false, blocked: false },
];

// Extended friend data for display (playerId → profile)
export const MOCK_FRIEND_PROFILES: Record<
  number,
  { nickname: string; level: number; job: string; status: string }
> = {
  7: { nickname: "Asuna", level: 76, job: "Fencer", status: "ONLINE" },
  13: { nickname: "Klein", level: 65, job: "Samurai", status: "IN_DUNGEON" },
  21: { nickname: "Agil", level: 72, job: "Warrior", status: "ONLINE" },
  34: { nickname: "Lisbeth", level: 60, job: "Blacksmith", status: "CRAFTING" },
  42: { nickname: "Silica", level: 55, job: "Beast Tamer", status: "ONLINE" },
  55: { nickname: "Leafa", level: 48, job: "Spriggan", status: "AWAY" },
  68: { nickname: "Sinon", level: 70, job: "Gunner", status: "ONLINE" },
  74: { nickname: "Eugeo", level: 68, job: "Swordsman", status: "OFFLINE" },
  89: { nickname: "Alice", level: 80, job: "Integrity Knight", status: "ONLINE" },
  93: { nickname: "Heathcliff", level: 100, job: "Paladin", status: "AWAY" },
};
