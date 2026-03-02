import { USE_MOCK, apiGet, apiPost } from "../client";
import {
  MOCK_DAILY_BLUEPRINTS,
  MOCK_GUILD_QUEST_ACCEPTANCES,
  MOCK_PARTY_QUEST_ACCEPTANCES,
  MOCK_STORY_ACCEPTANCES,
  MOCK_SUGGESTED_BLUEPRINTS,
} from "../mock/quest.mock";
import type { QuestAcceptance, QuestBlueprint } from "../types";

export async function getDailyBlueprintsApi(): Promise<QuestBlueprint[]> {
  if (USE_MOCK) return MOCK_DAILY_BLUEPRINTS;
  const res = await apiGet<{ blueprints: QuestBlueprint[] }>("/api/v1/quests/daily");
  return res.blueprints;
}

export async function getSuggestedBlueprintsApi(): Promise<QuestBlueprint[]> {
  if (USE_MOCK) return MOCK_SUGGESTED_BLUEPRINTS;
  const res = await apiGet<{ blueprints: QuestBlueprint[] }>("/api/v1/quests/suggested");
  return res.blueprints;
}

export async function getStoryQuestsApi(): Promise<QuestAcceptance[]> {
  if (USE_MOCK) return MOCK_STORY_ACCEPTANCES;
  const res = await apiGet<{ acceptances: QuestAcceptance[] }>("/api/v1/quests/me/story");
  return res.acceptances;
}

export async function getPartyQuestsApi(): Promise<QuestAcceptance[]> {
  if (USE_MOCK) return MOCK_PARTY_QUEST_ACCEPTANCES;
  const res = await apiGet<{ acceptances: QuestAcceptance[] }>("/api/v1/quests/me/party");
  return res.acceptances;
}

export async function getGuildQuestsApi(): Promise<QuestAcceptance[]> {
  if (USE_MOCK) return MOCK_GUILD_QUEST_ACCEPTANCES;
  const res = await apiGet<{ acceptances: QuestAcceptance[] }>("/api/v1/quests/me/guild");
  return res.acceptances;
}

export async function acceptQuestApi(questCode: string): Promise<QuestAcceptance> {
  if (USE_MOCK) {
    const found =
      MOCK_DAILY_BLUEPRINTS.find((q) => q.code === questCode) ??
      MOCK_SUGGESTED_BLUEPRINTS.find((q) => q.code === questCode);
    if (!found) throw new Error("Quest not found.");
    return {
      id: Date.now(),
      questId: Date.now(),
      code: found.code,
      title: found.title,
      category: found.category,
      descriptionMd: found.descriptionMd,
      targetType: found.targetType,
      targetValue: found.targetValue,
      progress: 0,
      status: "PENDING",
      repeatRule: found.repeatRule,
      periodStart: null,
      periodEnd: null,
      completedAt: null,
      dueAt: found.dueAt,
    };
  }
  return apiPost<QuestAcceptance>(`/api/v1/quests/${questCode}/accept`, {});
}
