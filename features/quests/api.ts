import { USE_MOCK, apiDelete, apiGet, apiGetRaw, apiPost, apiPut } from "@/shared/api/client";
import type {
  AcceptQuestRequest,
  CancelQuestRequest,
  CanceledQuest,
  PlayerQuestDetail,
  QuestAcceptance,
  QuestAcceptancesResponse,
  QuestBlueprint,
  QuestEvidence,
  QuestEvidenceInput,
  QuestCatalogResponse,
  QuestRoute,
  QuestRoutesResponse,
  QuestRouteStepDetail,
  QuestStatus,
  RewardSettlement,
} from "@/shared/api/types";
import { journeyMock } from "./mock";
import { awardSourceCommitted } from "@/features/player/awardEvents";

const playerQuestPath = (questCode: string) => `/api/v1/players/quests/${encodeURIComponent(questCode)}`;

export function getQuestRewardSettlementApi(questAcceptanceId: number): Promise<RewardSettlement> {
  return apiGet<RewardSettlement>(`/api/v1/reward-settlements/quest-completions/${questAcceptanceId}`);
}

export async function listQuestCatalogApi(): Promise<QuestBlueprint[]> {
  if (USE_MOCK) return journeyMock.catalog();
  return (await apiGetRaw<QuestCatalogResponse>("/api/v1/quests/catalog")).blueprints;
}

export async function listPlayerQuestsApi(status?: QuestStatus): Promise<QuestAcceptance[]> {
  if (USE_MOCK) return journeyMock.acceptances(status);
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return (await apiGetRaw<QuestAcceptancesResponse>(`/api/v1/players/quests${query}`)).acceptances;
}

export function getPlayerQuestApi(questCode: string): Promise<PlayerQuestDetail> {
  return USE_MOCK ? Promise.resolve(journeyMock.quest(questCode)) : apiGetRaw<PlayerQuestDetail>(playerQuestPath(questCode));
}

export async function acceptQuestApi(questCode: string): Promise<QuestAcceptance> {
  const body: AcceptQuestRequest = { partyId: null, guildId: null };
  const result = await (USE_MOCK
    ? Promise.resolve(journeyMock.accept(questCode))
    : apiPost<QuestAcceptance>(playerQuestPath(questCode), body));
  if (result.status === "COMPLETED") awardSourceCommitted();
  return result;
}

export async function manualCheckQuestApi(questCode: string): Promise<QuestAcceptance> {
  const result = await (USE_MOCK
    ? Promise.resolve(journeyMock.manualCheck(questCode))
    : apiPost<QuestAcceptance>(`${playerQuestPath(questCode)}/manual-check`, {}));
  if (result.status === "COMPLETED") awardSourceCommitted();
  return result;
}

export function cancelQuestApi(questCode: string, reason?: string): Promise<CanceledQuest> {
  const body: CancelQuestRequest = reason ? { reason } : {};
  return USE_MOCK
    ? Promise.resolve(journeyMock.cancel(questCode))
    : apiDelete<CanceledQuest>(playerQuestPath(questCode), body);
}

export async function listQuestRoutesApi(): Promise<QuestRoute[]> {
  if (USE_MOCK) return journeyMock.routes();
  return (await apiGet<QuestRoutesResponse>("/api/v1/quest-routes")).routes;
}

export function getQuestRouteApi(routeId: number): Promise<QuestRoute> {
  return USE_MOCK ? Promise.resolve(journeyMock.route()) : apiGet<QuestRoute>(`/api/v1/quest-routes/${routeId}`);
}

export function selectQuestRouteApi(routeId: number, roleId?: number): Promise<QuestRoute> {
  return USE_MOCK ? Promise.resolve(journeyMock.selectRoute()) : apiPost<QuestRoute>(`/api/v1/quest-routes/${routeId}/select`, roleId === undefined ? {} : { roleId });
}

export async function getQuestEvidenceApi(questCode: string): Promise<QuestEvidence | null> {
  return await apiGet<QuestEvidence | undefined>(`${playerQuestPath(questCode)}/evidence`) ?? null;
}

export function linkQuestEvidenceApi(questCode: string, evidence: QuestEvidenceInput): Promise<QuestAcceptance> {
  const kind = "memo" in evidence ? "memo" : "lifeLogId" in evidence ? "life-log" : "deployment";
  return apiPut<QuestAcceptance>(`${playerQuestPath(questCode)}/evidence/${kind}`, evidence);
}

export function unlinkQuestEvidenceApi(questCode: string): Promise<QuestAcceptance> {
  return apiDelete<QuestAcceptance>(`${playerQuestPath(questCode)}/evidence`);
}

export async function completeQuestApi(questCode: string): Promise<QuestAcceptance> {
  const result = await apiPost<QuestAcceptance>(`${playerQuestPath(questCode)}/complete`, {});
  if (result.status === "COMPLETED") awardSourceCommitted();
  return result;
}

export async function listMyQuestRoutesApi(): Promise<QuestRoute[]> {
  if (USE_MOCK) return journeyMock.myRoutes();
  return (await apiGet<QuestRoutesResponse>("/api/v1/quest-routes/my")).routes;
}

export function getMyQuestRouteApi(routeId: number): Promise<QuestRoute> {
  return USE_MOCK ? Promise.resolve(journeyMock.myRoute()) : apiGet<QuestRoute>(`/api/v1/quest-routes/my/${routeId}`);
}

export function getMyQuestRouteStepApi(routeId: number, stepId: number): Promise<QuestRouteStepDetail> {
  return USE_MOCK ? Promise.resolve(journeyMock.step(stepId)) : apiGet<QuestRouteStepDetail>(`/api/v1/quest-routes/my/${routeId}/steps/${stepId}`);
}

export async function advanceQuestRouteApi(routeId: number, expectedStepId: number): Promise<QuestRoute> {
  const result = await (USE_MOCK
    ? Promise.resolve(journeyMock.advance(expectedStepId))
    : apiPost<QuestRoute>(`/api/v1/quest-routes/my/${routeId}/advance`, { expectedStepId }));
  if (result.playerProgress?.status === "COMPLETED") awardSourceCommitted();
  return result;
}
