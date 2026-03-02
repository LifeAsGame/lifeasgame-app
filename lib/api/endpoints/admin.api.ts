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
