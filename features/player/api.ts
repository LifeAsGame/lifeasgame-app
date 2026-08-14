import { USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import type { PlayerAchievementInfo } from "@/shared/api/types";
import { achievementMock } from "./mock";

export type RegisterPlayerRequest = { name: string; gender: string };
export type CreatedPlayerWithToken = {
  id: number;
  accessToken: string;
  refreshToken: string;
};

export async function registerPlayerApi(body: RegisterPlayerRequest): Promise<CreatedPlayerWithToken> {
  if (USE_MOCK) {
    const id = Date.now();
    return { id, accessToken: `mock-player-access-${id}`, refreshToken: `mock-player-refresh-${id}` };
  }
  return apiPost<CreatedPlayerWithToken>("/api/v1/players/register", body);
}

export async function getPlayerAchievementsApi(): Promise<PlayerAchievementInfo[]> {
  if (USE_MOCK) return achievementMock.list();
  const result = await apiGet<{ infos: PlayerAchievementInfo[] }>("/api/v1/players/achievements");
  return result.infos;
}

export function getPlayerAchievementApi(achievementId: number): Promise<PlayerAchievementInfo> {
  return USE_MOCK
    ? Promise.resolve().then(() => achievementMock.detail(achievementId))
    : apiGet<PlayerAchievementInfo>(`/api/v1/players/achievements/${achievementId}`);
}
