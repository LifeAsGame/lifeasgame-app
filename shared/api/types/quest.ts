export type QuestStatus = "IN_PROGRESS" | "GOAL_REACHED" | "COMPLETED" | "CANCELED";

export interface QuestBlueprint {
  code: string;
  title: string;
  category: string | null;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  repeatRule: string;
  completionPolicy: "AUTO" | "USER_CONFIRM";
  definitionVersion: number;
  rewardProfileCode: string | null;
  rewardExp: number | null;
  rewardStats: Record<string, number> | null;
  dueAt: string | null;
  semanticCategory: string | null;
  progressSource: string | null;
  repeatPolicy: string | null;
  roleTemplateCode: string | null;
}

export interface QuestAcceptance {
  id: number;
  questId: number;
  code: string;
  title: string;
  category: string | null;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  progressValue: number;
  status: QuestStatus;
  completionPolicy: "AUTO" | "USER_CONFIRM";
  repeatRule: string;
  periodStart: string | null;
  periodEnd: string | null;
  acceptedAt: string;
  periodKey: string | null;
  goalReachedAt: string | null;
  completedAt: string | null;
  dueAt: string | null;
  semanticCategory: string | null;
  progressSource: string | null;
  repeatPolicy: string | null;
  roleTemplateCode: string | null;
}

export interface PlayerQuestDetail extends QuestBlueprint {
  acceptance: QuestAcceptance | null;
}

export interface QuestCatalogResponse {
  blueprints: QuestBlueprint[];
}

export interface QuestAcceptancesResponse {
  acceptances: QuestAcceptance[];
}

export interface AcceptQuestRequest {
  partyId: null;
  guildId: null;
}

export interface CancelQuestRequest {
  reason?: string;
}

export interface CanceledQuest {
  playerId: number;
  questId: number;
  questCode: string;
}
