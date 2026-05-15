import { USE_MOCK, apiDelete, apiGet, apiPost, apiPut } from "../client";
import { MOCK_ADMIN_USERS } from "../mock/user.mock";
import { MOCK_ACHIEVEMENTS } from "../mock/player.mock";
import { MOCK_INVENTORY_ITEMS } from "../mock/inventory.mock";
import { MOCK_DAILY_BLUEPRINTS, MOCK_SUGGESTED_BLUEPRINTS, MOCK_STORY_ACCEPTANCES } from "../mock/quest.mock";
import { MOCK_PARTIES, MOCK_GUILDS } from "../mock/social.mock";

// ===== Admin Player =====
export async function adminGetPlayersApi() {
  if (USE_MOCK) return MOCK_ADMIN_USERS;
  return apiGet("/api/v1/admin/players");
}

export async function adminUpdatePlayerStatsApi(
  playerId: number,
  stats: Record<string, number>,
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/players/${playerId}/stats`, stats);
}

// ===== Admin Titles =====
export async function adminGetTitlesApi() {
  if (USE_MOCK) {
    return [
      { titleId: 1, code: "BLACK_SWORDSMAN", name: "Black Swordsman", category: "Achievement" },
      { titleId: 2, code: "BEATER", name: "Beater", category: "Special" },
      { titleId: 3, code: "SOLO_KING", name: "Solo King", category: "Exploration" },
      { titleId: 4, code: "FLOOR_CLEARER", name: "Floor Clearer", category: "Combat" },
      { titleId: 5, code: "DUAL_WIELDER", name: "Dual Wielder", category: "Combat" },
    ];
  }
  return apiGet("/api/v1/admin/titles");
}

export async function adminCreateTitleApi(data: {
  code: string;
  name: string;
  category: string;
  descMd: string;
}): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/titles", data);
}

export async function adminDeleteTitleApi(titleId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/titles/${titleId}`);
}

// ===== Admin Achievements =====
export async function adminGetAchievementsApi() {
  if (USE_MOCK) return MOCK_ACHIEVEMENTS;
  return apiGet("/api/v1/admin/achievements");
}

export async function adminCreateAchievementApi(data: {
  code: string;
  name: string;
  category: string;
  descMd: string;
}): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/achievements", data);
}

export async function adminDeleteAchievementApi(achievementId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/achievements/${achievementId}`);
}

// ===== Admin Items =====
export async function adminGetItemsApi() {
  if (USE_MOCK) return MOCK_INVENTORY_ITEMS;
  return apiGet("/api/v1/admin/items");
}

export async function adminCreateItemApi(data: {
  name: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
}): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/items", data);
}

// ===== Admin Quests =====
export async function adminGetQuestsApi() {
  if (USE_MOCK) return [...MOCK_DAILY_BLUEPRINTS, ...MOCK_SUGGESTED_BLUEPRINTS];
  return apiGet("/api/v1/admin/quests");
}

export async function adminCreateQuestApi(data: {
  code: string;
  title: string;
  category: string;
  targetType: string;
  targetValue: number;
  repeatRule: string;
  rewardExp: number;
}): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/quests", data);
}

export async function adminDeleteQuestApi(questCode: string): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/quests/${questCode}`);
}

// ===== Admin Social =====
export async function adminGetPartiesApi() {
  if (USE_MOCK) return MOCK_PARTIES;
  return apiGet("/api/v1/admin/parties");
}

export async function adminDissolvePartyApi(partyId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/parties/${partyId}/dissolve`, {});
}

export async function adminGetGuildsApi() {
  if (USE_MOCK) return MOCK_GUILDS;
  return apiGet("/api/v1/admin/guilds");
}

export async function adminDissolveGuildApi(guildId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/guilds/${guildId}/dissolve`, {});
}

// ===== Admin Users =====
export async function adminGetUsersApi() {
  if (USE_MOCK) return MOCK_ADMIN_USERS;
  return apiGet("/api/v1/admin/users");
}

export async function adminDeleteUserApi(userId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/users/${userId}`);
}

// ===== Admin Economy =====
export async function adminGetListingsApi() {
  if (USE_MOCK) {
    return [
      { id: 201, itemId: 1001, sellerId: 6, price: 35000, currency: "col", status: "ACTIVE" },
      { id: 202, itemId: 2001, sellerId: 12, price: 62000, currency: "col", status: "ACTIVE" },
      { id: 203, itemId: 3001, sellerId: 24, price: 1200, currency: "col", status: "RESERVED" },
    ];
  }
  return apiGet("/api/v1/admin/economy/listings");
}

export async function adminCancelListingApi(listingId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/economy/listings/${listingId}/cancel`, {});
}

// ===== Admin Player Update =====
export async function adminUpdatePlayerNicknameApi(playerId: number, nickname: string): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/players/${playerId}/nickname`, { nickname });
}

// ===== Admin Title Update =====
export async function adminUpdateTitleApi(
  titleId: number,
  data: { code: string; name: string; category: string; descMd: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/titles/${titleId}`, data);
}

// ===== Admin Achievement Update =====
export async function adminUpdateAchievementApi(
  achievementId: number,
  data: { code: string; name: string; category: string; descMd: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/achievements/${achievementId}`, data);
}

// ===== Admin Item Instances (cross-player) =====
const MOCK_ITEM_INSTANCES = MOCK_INVENTORY_ITEMS.map((item, i) => ({
  instanceId: item.itemInstanceId,
  itemId: item.itemId,
  itemName: item.itemName,
  category: item.category,
  type: (item as unknown as Record<string, unknown>).type as string ?? "—",
  rarity: item.rarity,
  quantity: item.quantity,
  bound: item.bound,
  playerId: i % 3 === 0 ? 12 : i % 3 === 1 ? 6 : 24,
  playerNickname: i % 3 === 0 ? "Asuna" : i % 3 === 1 ? "Kirito" : "Agil",
}));

export async function adminGetItemInstancesApi(): Promise<typeof MOCK_ITEM_INSTANCES> {
  if (USE_MOCK) return MOCK_ITEM_INSTANCES;
  return apiGet("/api/v1/admin/items/instances");
}

export async function adminUpdateItemDefinitionApi(
  itemId: number,
  data: { name: string; category: string; type: string; rarity: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/items/definitions/${itemId}`, data);
}

export async function adminConfiscateItemApi(instanceId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/items/instances/${instanceId}`);
}

// ===== Admin Quest Update =====
export async function adminUpdateQuestApi(
  questCode: string,
  data: { title: string; category: string; targetType: string; targetValue: number; repeatRule: string; rewardExp: number },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/quests/${questCode}`, data);
}

// ===== Admin Economy Update =====
export async function adminUpdateListingApi(
  listingId: number,
  data: { price: number; status: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/economy/listings/${listingId}`, data);
}

// ===== Admin Party Update & Member Management =====
type MemberRow = { memberId: number; playerId: number; nickname: string; role: string; joinedAt: string };

const MOCK_PARTY_MEMBERS: Record<number, MemberRow[]> = {
  1: [
    { memberId: 101, playerId: 6,  nickname: "Kirito",     role: "LEADER", joinedAt: "2024-01-10" },
    { memberId: 102, playerId: 12, nickname: "Asuna",      role: "MEMBER", joinedAt: "2024-01-11" },
    { memberId: 103, playerId: 15, nickname: "Klein",      role: "MEMBER", joinedAt: "2024-01-12" },
  ],
  2: [
    { memberId: 201, playerId: 20, nickname: "Agil",       role: "LEADER", joinedAt: "2024-02-01" },
    { memberId: 202, playerId: 22, nickname: "Silica",     role: "MEMBER", joinedAt: "2024-02-02" },
    { memberId: 203, playerId: 24, nickname: "Leafa",      role: "MEMBER", joinedAt: "2024-02-05" },
  ],
};

export async function adminUpdatePartyApi(
  partyId: number,
  data: { name: string; status: string; maxMembers: number; joinPolicy: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/parties/${partyId}`, data);
}

export async function adminGetPartyMembersApi(partyId: number): Promise<MemberRow[]> {
  if (USE_MOCK) return MOCK_PARTY_MEMBERS[partyId] ?? [];
  const res = await apiGet<{ members: MemberRow[] }>(`/api/v1/admin/parties/${partyId}/members`);
  return res.members;
}

export async function adminAddPartyMemberApi(partyId: number, playerId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/parties/${partyId}/members`, { playerId });
}

export async function adminRemovePartyMemberApi(partyId: number, memberId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/parties/${partyId}/members/${memberId}`);
}

// ===== Admin Guild Update & Member Management =====
const MOCK_GUILD_MEMBERS: Record<number, MemberRow[]> = {
  1: [
    { memberId: 1001, playerId: 6,  nickname: "Kirito",     role: "MEMBER",  joinedAt: "2024-01-15" },
    { memberId: 1002, playerId: 12, nickname: "Asuna",      role: "OFFICER", joinedAt: "2024-01-15" },
    { memberId: 1003, playerId: 30, nickname: "Heathcliff", role: "LEADER",  joinedAt: "2024-01-01" },
    { memberId: 1004, playerId: 15, nickname: "Klein",      role: "MEMBER",  joinedAt: "2024-02-01" },
  ],
  2: [
    { memberId: 2001, playerId: 18, nickname: "Lisbeth",    role: "LEADER",  joinedAt: "2024-03-01" },
    { memberId: 2002, playerId: 22, nickname: "Silica",     role: "MEMBER",  joinedAt: "2024-03-05" },
  ],
};

export async function adminUpdateGuildApi(
  guildId: number,
  data: { name: string; status: string; maxMembers: number; joinPolicy: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/guilds/${guildId}`, data);
}

export async function adminGetGuildMembersApi(guildId: number): Promise<MemberRow[]> {
  if (USE_MOCK) return MOCK_GUILD_MEMBERS[guildId] ?? [];
  const res = await apiGet<{ members: MemberRow[] }>(`/api/v1/admin/guilds/${guildId}/members`);
  return res.members;
}

export async function adminAddGuildMemberApi(guildId: number, playerId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/guilds/${guildId}/members`, { playerId });
}

export async function adminRemoveGuildMemberApi(guildId: number, memberId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/guilds/${guildId}/members/${memberId}`);
}

// ===== Admin Title Holders =====
type PlayerTitleRow = {
  playerId: number;
  nickname: string;
  titleId: number;
  code: string;
  name: string;
  assignedAt: string;
};

const MOCK_PLAYER_TITLES: PlayerTitleRow[] = [
  { playerId: 6,  nickname: "Kirito",     titleId: 1, code: "BLACK_SWORDSMAN", name: "Black Swordsman", assignedAt: "2024-01-15" },
  { playerId: 6,  nickname: "Kirito",     titleId: 2, code: "BEATER",          name: "Beater",          assignedAt: "2024-01-16" },
  { playerId: 12, nickname: "Asuna",      titleId: 4, code: "FLOOR_CLEARER",   name: "Floor Clearer",   assignedAt: "2024-02-01" },
  { playerId: 30, nickname: "Heathcliff", titleId: 3, code: "SOLO_KING",       name: "Solo King",       assignedAt: "2023-12-01" },
  { playerId: 15, nickname: "Klein",      titleId: 4, code: "FLOOR_CLEARER",   name: "Floor Clearer",   assignedAt: "2024-03-10" },
  { playerId: 22, nickname: "Silica",     titleId: 5, code: "DUAL_WIELDER",    name: "Dual Wielder",    assignedAt: "2024-04-01" },
];

export async function adminGetTitleHoldersApi(titleId: number): Promise<PlayerTitleRow[]> {
  if (USE_MOCK) return MOCK_PLAYER_TITLES.filter((pt) => pt.titleId === titleId);
  const res = await apiGet<{ holders: PlayerTitleRow[] }>(`/api/v1/admin/titles/${titleId}/holders`);
  return res.holders;
}

export async function adminAssignTitleApi(titleId: number, playerId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/titles/${titleId}/assign`, { playerId });
}

export async function adminRevokeTitleApi(titleId: number, playerId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/titles/${titleId}/holders/${playerId}`);
}

// ===== Admin Item Definitions =====
const MOCK_ITEM_DEFS = Array.from(
  new Map(
    MOCK_ITEM_INSTANCES.map((inst) => [
      inst.itemId,
      {
        itemId: inst.itemId,
        name: inst.itemName,
        category: inst.category,
        type: inst.type ?? "—",
        rarity: inst.rarity,
      },
    ]),
  ).values(),
);

export async function adminGetItemDefinitionsApi(): Promise<typeof MOCK_ITEM_DEFS> {
  if (USE_MOCK) return MOCK_ITEM_DEFS;
  return apiGet("/api/v1/admin/items/definitions");
}

export async function adminGetItemHoldersByItemApi(itemId: number): Promise<typeof MOCK_ITEM_INSTANCES> {
  if (USE_MOCK) return MOCK_ITEM_INSTANCES.filter((i) => i.itemId === itemId);
  return apiGet(`/api/v1/admin/items/${itemId}/instances`);
}

export async function adminGetPlayerItemsApi(playerId: number): Promise<typeof MOCK_ITEM_INSTANCES> {
  if (USE_MOCK) return MOCK_ITEM_INSTANCES.filter((i) => i.playerId === playerId);
  return apiGet(`/api/v1/admin/items/instances?playerId=${playerId}`);
}

export async function adminAddToInventoryApi(
  playerId: number,
  data: { itemId: number; quantity: number; bound: boolean },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/inventory`, data);
}

export async function adminDeliverToMailboxApi(
  playerId: number,
  data: { itemId: number; quantity: number; bound: boolean },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/mailbox`, data);
}

// ===== Admin Achievement Holders =====
type PlayerAchievementRow = {
  playerId: number;
  nickname: string;
  achievementId: number;
  code: string;
  name: string;
  category: string;
  acquiredAt: string;
};

const MOCK_PLAYER_ACHIEVEMENTS: PlayerAchievementRow[] = [
  { playerId: 6,  nickname: "Kirito",     achievementId: 1, code: "FIRST_KILL",       name: "First Kill",       category: "Combat",   acquiredAt: "2024-01-10" },
  { playerId: 12, nickname: "Asuna",      achievementId: 1, code: "FIRST_KILL",       name: "First Kill",       category: "Combat",   acquiredAt: "2024-01-12" },
  { playerId: 6,  nickname: "Kirito",     achievementId: 2, code: "FLOOR_CLEARER",    name: "Floor Clearer",    category: "Combat",   acquiredAt: "2024-02-01" },
  { playerId: 15, nickname: "Klein",      achievementId: 3, code: "SOCIAL_BUTTERFLY", name: "Social Butterfly", category: "Social",   acquiredAt: "2024-03-15" },
  { playerId: 22, nickname: "Silica",     achievementId: 4, code: "COLLECTOR",        name: "Collector",        category: "Collection", acquiredAt: "2024-04-20" },
];

export async function adminGetAchievementHoldersApi(achievementId: number): Promise<PlayerAchievementRow[]> {
  if (USE_MOCK) return MOCK_PLAYER_ACHIEVEMENTS.filter((pa) => pa.achievementId === achievementId);
  const res = await apiGet<{ holders: PlayerAchievementRow[] }>(`/api/v1/admin/achievements/${achievementId}/holders`);
  return res.holders;
}

export async function adminGrantAchievementApi(playerId: number, achievementId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/achievements/${achievementId}`, {});
}

export async function adminRevokeAchievementApi(playerId: number, achievementId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/players/${playerId}/achievements/${achievementId}`);
}

// ===== Admin Certifications =====
type CertificationRow = { certificationId: number; name: string; issuer: string; category: string };
type PlayerCertificationRow = {
  playerId: number; nickname: string;
  certificationId: number; name: string; issuer: string; category: string;
  acquiredDate: string; expiresDate: string | null;
};

const MOCK_CERTIFICATIONS: CertificationRow[] = [
  { certificationId: 1, name: "AWS Developer",    issuer: "Amazon",  category: "Tech" },
  { certificationId: 2, name: "Google Analytics", issuer: "Google",  category: "Marketing" },
  { certificationId: 3, name: "JLPT N2",          issuer: "JEES",    category: "Language" },
  { certificationId: 4, name: "OPIC IH",          issuer: "ACTFL",   category: "Language" },
];

const MOCK_PLAYER_CERTIFICATIONS: PlayerCertificationRow[] = [
  { playerId: 6,  nickname: "Kirito", certificationId: 1, name: "AWS Developer",    issuer: "Amazon", category: "Tech",     acquiredDate: "2024-01-15", expiresDate: "2026-01-15" },
  { playerId: 12, nickname: "Asuna",  certificationId: 3, name: "JLPT N2",          issuer: "JEES",   category: "Language", acquiredDate: "2023-12-01", expiresDate: null },
  { playerId: 6,  nickname: "Kirito", certificationId: 4, name: "OPIC IH",          issuer: "ACTFL",  category: "Language", acquiredDate: "2024-03-10", expiresDate: "2025-03-10" },
];

export async function adminGetCertificationsApi(): Promise<CertificationRow[]> {
  if (USE_MOCK) return MOCK_CERTIFICATIONS;
  return apiGet("/api/v1/admin/certifications");
}

export async function adminCreateCertificationApi(data: { name: string; issuer: string; category: string }): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/certifications", data);
}

export async function adminUpdateCertificationApi(certId: number, data: { name: string; issuer: string; category: string }): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/certifications/${certId}`, data);
}

export async function adminDeleteCertificationApi(certId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/certifications/${certId}`);
}

export async function adminGetCertificationHoldersApi(certId: number): Promise<PlayerCertificationRow[]> {
  if (USE_MOCK) return MOCK_PLAYER_CERTIFICATIONS.filter((pc) => pc.certificationId === certId);
  const res = await apiGet<{ holders: PlayerCertificationRow[] }>(`/api/v1/admin/certifications/${certId}/holders`);
  return res.holders;
}

export async function adminGrantCertificationApi(
  playerId: number, certId: number,
  data: { acquiredDate: string; expiresDate?: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/certifications/${certId}`, data);
}

export async function adminRevokeCertificationApi(playerId: number, certId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/players/${playerId}/certifications/${certId}`);
}

// ===== Admin Hobbies =====
type HobbyRow = { hobbyId: number; name: string; category: string };
type PlayerHobbyRow = {
  playerId: number; nickname: string;
  hobbyId: number; name: string; category: string;
  proficiency: number; status: string; startedOn: string;
};

const MOCK_HOBBIES: HobbyRow[] = [
  { hobbyId: 1, name: "Running",     category: "Exercise" },
  { hobbyId: 2, name: "Piano",       category: "Music" },
  { hobbyId: 3, name: "Photography", category: "Art" },
  { hobbyId: 4, name: "Cooking",     category: "Lifestyle" },
  { hobbyId: 5, name: "Reading",     category: "Lifestyle" },
];

const MOCK_PLAYER_HOBBIES: PlayerHobbyRow[] = [
  { playerId: 6,  nickname: "Kirito",     hobbyId: 1, name: "Running",     category: "Exercise",  proficiency: 4, status: "ACTIVE",  startedOn: "2023-06-01" },
  { playerId: 12, nickname: "Asuna",      hobbyId: 4, name: "Cooking",     category: "Lifestyle", proficiency: 5, status: "ACTIVE",  startedOn: "2022-03-01" },
  { playerId: 6,  nickname: "Kirito",     hobbyId: 5, name: "Reading",     category: "Lifestyle", proficiency: 2, status: "ON_HOLD", startedOn: "2024-01-01" },
  { playerId: 30, nickname: "Heathcliff", hobbyId: 2, name: "Piano",       category: "Music",     proficiency: 3, status: "ACTIVE",  startedOn: "2023-01-15" },
];

export async function adminGetHobbiesApi(): Promise<HobbyRow[]> {
  if (USE_MOCK) return MOCK_HOBBIES;
  return apiGet("/api/v1/admin/hobbies");
}

export async function adminCreateHobbyApi(data: { name: string; category: string }): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/hobbies", data);
}

export async function adminUpdateHobbyApi(hobbyId: number, data: { name: string; category: string }): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/hobbies/${hobbyId}`, data);
}

export async function adminDeleteHobbyApi(hobbyId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/hobbies/${hobbyId}`);
}

export async function adminGetHobbyHoldersApi(hobbyId: number): Promise<PlayerHobbyRow[]> {
  if (USE_MOCK) return MOCK_PLAYER_HOBBIES.filter((ph) => ph.hobbyId === hobbyId);
  const res = await apiGet<{ holders: PlayerHobbyRow[] }>(`/api/v1/admin/hobbies/${hobbyId}/holders`);
  return res.holders;
}

export async function adminGrantHobbyApi(
  playerId: number, hobbyId: number,
  data: { proficiency: number; status: string; startedOn: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/hobbies/${hobbyId}`, data);
}

export async function adminRevokeHobbyApi(playerId: number, hobbyId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiDelete(`/api/v1/admin/players/${playerId}/hobbies/${hobbyId}`);
}

// ===== Admin Player Advanced Stats =====
export async function adminGrantExpApi(playerId: number, expDelta: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/exp`, { expDelta });
}

export async function adminAdjustVitalsApi(
  playerId: number,
  data: { hpDelta?: number; hpCapacityDelta?: number; mpDelta?: number; mpCapacityDelta?: number },
): Promise<void> {
  if (USE_MOCK) return;
  const { hpDelta, hpCapacityDelta, mpDelta, mpCapacityDelta } = data;
  if (hpDelta)        await apiPost(`/api/v1/admin/players/${playerId}/hp`, { hpDelta });
  if (hpCapacityDelta) await apiPost(`/api/v1/admin/players/${playerId}/hp/capacity`, { hpCapacityDelta });
  if (mpDelta)        await apiPost(`/api/v1/admin/players/${playerId}/mp`, { mpDelta });
  if (mpCapacityDelta) await apiPost(`/api/v1/admin/players/${playerId}/mp/capacity`, { mpCapacityDelta });
}

export async function adminGrantCoreStatsApi(
  playerId: number,
  data: { strDelta?: number; agiDelta?: number; dexDelta?: number; intelDelta?: number; vitDelta?: number; lucDelta?: number },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/players/${playerId}/stats/core`, data);
}

// ===== Admin Quest Definitions & Acceptances =====
const MOCK_QUEST_DEFINITIONS = [
  { id: 1, code: "DAILY_RUN_3KM",    title: "3km 달리기",        category: "Daily",  targetType: "DISTANCE_KM",  targetValue: 3,    repeatRule: "DAILY",   rewardExp: 150 },
  { id: 2, code: "DAILY_RUN_5KM",    title: "5km 달리기",        category: "Daily",  targetType: "DISTANCE_KM",  targetValue: 5,    repeatRule: "DAILY",   rewardExp: 250 },
  { id: 3, code: "WEEKLY_PUSHUP_100",title: "팔굽혀펴기 100회",  category: "Weekly", targetType: "REPETITION",   targetValue: 100,  repeatRule: "WEEKLY",  rewardExp: 500 },
  { id: 4, code: "STORY_FLOOR_25",   title: "25층 클리어",       category: "Story",  targetType: "FLOOR_CLEAR",  targetValue: 25,   repeatRule: "NONE",    rewardExp: 2000 },
  { id: 5, code: "DAILY_STUDY_1H",   title: "공부 1시간",        category: "Daily",  targetType: "DURATION_MIN", targetValue: 60,   repeatRule: "DAILY",   rewardExp: 120 },
];

type QuestAcceptanceRow = {
  id: number; questId: number; playerId: number; playerNickname: string;
  code: string; title: string; category: string;
  targetType: string; targetValue: number; progress: number;
  status: string; repeatRule: string;
};

const MOCK_QUEST_ACCEPTANCES: QuestAcceptanceRow[] = [
  { id: 1001, questId: 1, playerId: 6,  playerNickname: "Kirito", code: "DAILY_RUN_3KM",    title: "3km 달리기",       category: "Daily",  targetType: "DISTANCE_KM",  targetValue: 3,   progress: 2, status: "IN_PROGRESS", repeatRule: "DAILY"  },
  { id: 1002, questId: 1, playerId: 12, playerNickname: "Asuna",  code: "DAILY_RUN_3KM",    title: "3km 달리기",       category: "Daily",  targetType: "DISTANCE_KM",  targetValue: 3,   progress: 3, status: "COMPLETED",   repeatRule: "DAILY"  },
  { id: 1003, questId: 2, playerId: 6,  playerNickname: "Kirito", code: "DAILY_RUN_5KM",    title: "5km 달리기",       category: "Daily",  targetType: "DISTANCE_KM",  targetValue: 5,   progress: 0, status: "FAILED",      repeatRule: "DAILY"  },
  { id: 1004, questId: 4, playerId: 30, playerNickname: "Heathcliff", code: "STORY_FLOOR_25", title: "25층 클리어",    category: "Story",  targetType: "FLOOR_CLEAR",  targetValue: 25,  progress: 25,status: "COMPLETED",   repeatRule: "NONE"   },
  { id: 1005, questId: 5, playerId: 15, playerNickname: "Klein",  code: "DAILY_STUDY_1H",   title: "공부 1시간",       category: "Daily",  targetType: "DURATION_MIN", targetValue: 60,  progress: 30,status: "IN_PROGRESS", repeatRule: "DAILY"  },
];

export async function adminGetQuestDefinitionsApi(): Promise<typeof MOCK_QUEST_DEFINITIONS> {
  if (USE_MOCK) return MOCK_QUEST_DEFINITIONS;
  return apiGet("/api/v1/admin/quests/definitions");
}

export async function adminGetAllQuestAcceptancesApi(status?: string): Promise<QuestAcceptanceRow[]> {
  if (USE_MOCK) return status ? MOCK_QUEST_ACCEPTANCES.filter((a) => a.status === status) : MOCK_QUEST_ACCEPTANCES;
  const url = status ? `/api/v1/admin/quests/acceptances?status=${status}` : "/api/v1/admin/quests/acceptances";
  return apiGet(url);
}

export async function adminGetQuestAcceptancesByCodeApi(questCode: string): Promise<QuestAcceptanceRow[]> {
  if (USE_MOCK) return MOCK_QUEST_ACCEPTANCES.filter((a) => a.code === questCode);
  return apiGet(`/api/v1/admin/quests/${questCode}/acceptances`);
}

export async function adminAdjustQuestProgressApi(
  acceptanceId: number,
  data: { type: "SET" | "ADD"; value: number },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/quests/acceptances/${acceptanceId}/progress`, data);
}

export async function adminChangeQuestStatusApi(
  acceptanceId: number,
  data: { status: string; reason?: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/quests/acceptances/${acceptanceId}/status`, data);
}

// ===== Admin Economy Shop =====
const MOCK_SHOP_ITEMS = [
  { id: 1, itemId: 101, itemName: "Elucidator",    price: 15000, currency: "col", available: true,  globalStockLimit: null, perPlayerLimit: 3,  reservationTtlSec: 300 },
  { id: 2, itemId: 201, itemName: "Healing Potion",price: 500,   currency: "col", available: true,  globalStockLimit: 100, perPlayerLimit: 10, reservationTtlSec: 60  },
  { id: 3, itemId: 301, itemName: "Wind Fleuret",   price: 8000,  currency: "col", available: false, globalStockLimit: 5,   perPlayerLimit: 1,  reservationTtlSec: 600 },
];

export async function adminGetShopItemsApi(): Promise<typeof MOCK_SHOP_ITEMS> {
  if (USE_MOCK) return MOCK_SHOP_ITEMS;
  return apiGet("/api/v1/admin/economy/shop");
}

export async function adminCreateShopItemApi(data: {
  itemId: number; price: number; currency: string;
  globalLimit?: number; perPlayerLimit?: number; reservationTtlSeconds?: number;
}): Promise<void> {
  if (USE_MOCK) return;
  await apiPost("/api/v1/admin/economy/shop", data);
}

export async function adminUpdateShopItemApi(
  shopItemId: number,
  data: { price?: number; globalLimit?: number; perPlayerLimit?: number; reservationTtlSeconds?: number },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/economy/shop/${shopItemId}`, data);
}

export async function adminToggleShopItemApi(shopItemId: number, enabled: boolean): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/economy/shop/${shopItemId}/toggle`, { enabled });
}

export async function adminAdjustWalletApi(
  playerId: number,
  data: { amount: number; currency: string; debit: boolean; reason: string },
): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/admin/economy/wallets/${playerId}/adjust`, data);
}

// ===== Admin User Status =====
export async function adminChangeUserStatusApi(userId: number, status: string, reason: string): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/admin/users/${userId}/status`, { toStatus: status, reason });
}
