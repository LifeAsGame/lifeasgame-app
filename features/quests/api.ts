import { USE_MOCK, apiDelete, apiGet, apiGetRaw, apiPost } from "@/shared/api/client";
import type {
  CanceledQuest,
  PlayerQuestDetail,
  QuestAcceptance,
  QuestAcceptancesResponse,
  QuestBlueprint,
  QuestCatalogResponse,
  QuestRoute,
  QuestRoutesResponse,
  QuestRouteStepDetail,
  QuestStatus,
} from "@/shared/api/types";
import { journeyMock } from "./mock";

export async function listQuestCatalogApi(): Promise<QuestBlueprint[]> {
  if (USE_MOCK) return journeyMock.catalog();
  return (await apiGetRaw<QuestCatalogResponse>("/api/v1/quests/catalog")).blueprints;
}

export async function listPlayerQuestsApi(status?: QuestStatus): Promise<QuestAcceptance[]> {
  if (USE_MOCK) return journeyMock.acceptances(status);
  const query = status ? `?status=${status}` : "";
  return (await apiGetRaw<QuestAcceptancesResponse>(`/api/v1/players/quests${query}`)).acceptances;
}

export function getPlayerQuestApi(questCode: string): Promise<PlayerQuestDetail> {
  return USE_MOCK ? Promise.resolve(journeyMock.quest(questCode)) : apiGetRaw<PlayerQuestDetail>(`/api/v1/players/quests/${questCode}`);
}

export function acceptQuestApi(questCode: string): Promise<QuestAcceptance> {
  return USE_MOCK
    ? Promise.resolve(journeyMock.accept(questCode))
    : apiPost<QuestAcceptance>(`/api/v1/players/quests/${questCode}`, { partyId: null, guildId: null });
}

export function manualCheckQuestApi(questCode: string): Promise<QuestAcceptance> {
  return USE_MOCK
    ? Promise.resolve(journeyMock.manualCheck(questCode))
    : apiPost<QuestAcceptance>(`/api/v1/players/quests/${questCode}/manual-check`, {});
}

export function cancelQuestApi(questCode: string, reason?: string): Promise<CanceledQuest> {
  const body = reason ? { reason } : {};
  return USE_MOCK
    ? Promise.resolve(journeyMock.cancel(questCode))
    : apiDelete<CanceledQuest>(`/api/v1/players/quests/${questCode}`, body);
}

export async function listQuestRoutesApi(): Promise<QuestRoute[]> {
  if (USE_MOCK) return journeyMock.routes();
  return (await apiGet<QuestRoutesResponse>("/api/v1/quest-routes")).routes;
}

export function getQuestRouteApi(routeId: number): Promise<QuestRoute> {
  return USE_MOCK ? Promise.resolve(journeyMock.route()) : apiGet<QuestRoute>(`/api/v1/quest-routes/${routeId}`);
}

export function selectQuestRouteApi(routeId: number): Promise<QuestRoute> {
  return USE_MOCK ? Promise.resolve(journeyMock.selectRoute()) : apiPost<QuestRoute>(`/api/v1/quest-routes/${routeId}/select`, {});
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

export function advanceQuestRouteApi(routeId: number, expectedStepId: number): Promise<QuestRoute> {
  return USE_MOCK
    ? Promise.resolve(journeyMock.advance(expectedStepId))
    : apiPost<QuestRoute>(`/api/v1/quest-routes/my/${routeId}/advance`, { expectedStepId });
}
