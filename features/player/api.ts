import { USE_MOCK, apiDelete, apiGet, apiPatch, apiPost } from "@/shared/api/client";
import type {
  CertificationCatalogInfo,
  PlayerInfo,
  PlayerAchievementInfo,
  PlayerCertificationDatesRequest,
  PlayerCertificationInfo,
  PlayerCertificationMutationResult,
  PlayerTitleInfo,
} from "@/shared/api/types";
import { achievementMock, certificationMock, titleMock } from "./mock";

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

export async function getCertificationCatalogApi(): Promise<CertificationCatalogInfo[]> {
  if (USE_MOCK) return certificationMock.catalog();
  const result = await apiGet<{ infos: CertificationCatalogInfo[] }>("/api/v1/certifications");
  return result.infos;
}

export async function getPlayerCertificationsApi(): Promise<PlayerCertificationInfo[]> {
  if (USE_MOCK) return certificationMock.owned();
  const result = await apiGet<{ infos: PlayerCertificationInfo[] }>("/api/v1/players/certifications");
  return result.infos;
}

export function registerPlayerCertificationApi(certificationId: number, body: PlayerCertificationDatesRequest): Promise<PlayerCertificationMutationResult> {
  return USE_MOCK
    ? Promise.resolve().then(() => certificationMock.register(certificationId, body))
    : apiPost<PlayerCertificationMutationResult>(`/api/v1/players/certifications/${certificationId}`, body);
}

export function updatePlayerCertificationApi(certificationId: number, body: PlayerCertificationDatesRequest): Promise<PlayerCertificationMutationResult> {
  return USE_MOCK
    ? Promise.resolve().then(() => certificationMock.update(certificationId, body))
    : apiPatch<PlayerCertificationMutationResult>(`/api/v1/players/certifications/${certificationId}`, body);
}

export function deletePlayerCertificationApi(certificationId: number): Promise<number> {
  return USE_MOCK
    ? Promise.resolve().then(() => certificationMock.delete(certificationId))
    : apiDelete<number>(`/api/v1/players/certifications/${certificationId}`);
}

export function getCurrentPlayerApi(): Promise<PlayerInfo> {
  return USE_MOCK ? Promise.resolve(titleMock.player()) : apiGet<PlayerInfo>("/api/v1/players");
}

export async function getPlayerTitlesApi(): Promise<PlayerTitleInfo[]> {
  if (USE_MOCK) return titleMock.titles();
  const result = await apiGet<{ infos: PlayerTitleInfo[] }>("/api/v1/players/titles");
  return result.infos;
}

export function setRepresentativeTitleApi(titleId: number): Promise<{ titleId: number }> {
  return USE_MOCK
    ? Promise.resolve().then(() => titleMock.setRepresentative(titleId))
    : apiPatch<{ titleId: number }>(`/api/v1/players/titles/${titleId}`, undefined);
}
