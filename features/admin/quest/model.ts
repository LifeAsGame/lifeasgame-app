type AdminQuestDefinitionFields = {
  code: string;
  title: string;
  category: string | null;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  repeatRule: string;
  completionPolicy: string;
  definitionVersion: number;
  rewardProfileCode: string | null;
  rewardExp: number | null;
  rewardStats: Record<string, number> | null;
  dueAt: string | null;
  semanticCategory: string | null;
  progressSource: string | null;
  repeatPolicy: string | null;
  roleTemplateCode: string | null;
};

export type AdminQuestBlueprint = AdminQuestDefinitionFields;

export type AdminQuestDefinition = AdminQuestDefinitionFields & {
  id: number;
};

export const ADMIN_QUEST_ACCEPTANCE_STATUSES = ["IN_PROGRESS", "GOAL_REACHED", "COMPLETED", "CANCELED"] as const;
export type AdminQuestAcceptanceStatus = typeof ADMIN_QUEST_ACCEPTANCE_STATUSES[number];

export type AdminQuestAcceptance = {
  id: number;
  questId: number;
  playerId: number;
  code: string;
  title: string;
  category: string | null;
  targetType: string;
  targetValue: number;
  progressValue: number;
  status: AdminQuestAcceptanceStatus;
  completionPolicy: string;
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
};

export type AdminQuestBlueprints = { blueprints: AdminQuestBlueprint[] };
export type AdminQuestDefinitions = { definitions: AdminQuestDefinition[] };
export type AdminQuestAcceptances = { acceptances: AdminQuestAcceptance[] };
