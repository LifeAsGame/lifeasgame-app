import { ApiError } from "@/shared/api/client";
import type {
  AdminQuestAcceptance,
  AdminQuestAcceptances,
  AdminQuestAcceptanceStatus,
  AdminQuestBlueprint,
  AdminQuestBlueprints,
  AdminQuestDefinition,
  AdminQuestDefinitions,
} from "../quest/model";
import {
  normalizeAdminQuestCode,
  requirePositiveAdminAcceptanceId,
  validateAdminQuestAcceptanceStatus,
} from "./quest.query";

const BLUEPRINTS: AdminQuestBlueprint[] = [
  {
    code: "quest:record:first-trace", title: "First Trace", category: null, descriptionMd: "Record one LifeLog entry.",
    targetType: "COUNT", targetValue: 1, repeatRule: "ONCE", completionPolicy: "AUTO", definitionVersion: 2,
    rewardProfileCode: "RP_EXP_TINY_10", rewardExp: null, rewardStats: null, dueAt: null,
    semanticCategory: "RECORD", progressSource: "RECORD_CREATED", repeatPolicy: "ONCE", roleTemplateCode: null,
  },
  {
    code: "quest:daily:walk", title: "Daily Walk", category: "DAILY", descriptionMd: "Complete one walk.",
    targetType: "COUNT", targetValue: 1, repeatRule: "DAILY", completionPolicy: "USER_CONFIRM", definitionVersion: 1,
    rewardProfileCode: null, rewardExp: 10, rewardStats: {}, dueAt: null,
    semanticCategory: null, progressSource: null, repeatPolicy: null, roleTemplateCode: null,
  },
];

const DEFINITIONS: AdminQuestDefinition[] = BLUEPRINTS.map((blueprint, index) => ({ id: 501 + index, ...blueprint }));

const ACCEPTANCES: AdminQuestAcceptance[] = [
  {
    id: 9001, questId: 501, playerId: 10218, code: "quest:record:first-trace", title: "First Trace", category: null,
    targetType: "COUNT", targetValue: 1, progressValue: 0, status: "IN_PROGRESS", completionPolicy: "AUTO", repeatRule: "ONCE",
    periodStart: null, periodEnd: null, acceptedAt: "2026-08-24T04:00:00Z", periodKey: null,
    goalReachedAt: null, completedAt: null, dueAt: null, semanticCategory: "RECORD", progressSource: "RECORD_CREATED",
    repeatPolicy: "ONCE", roleTemplateCode: null,
  },
  {
    id: 9002, questId: 501, playerId: 10219, code: "quest:record:first-trace", title: "First Trace", category: null,
    targetType: "COUNT", targetValue: 1, progressValue: 1, status: "COMPLETED", completionPolicy: "AUTO", repeatRule: "ONCE",
    periodStart: null, periodEnd: null, acceptedAt: "2026-08-23T04:00:00Z", periodKey: null,
    goalReachedAt: "2026-08-23T04:05:00Z", completedAt: "2026-08-23T04:05:00Z", dueAt: null,
    semanticCategory: "RECORD", progressSource: "RECORD_CREATED", repeatPolicy: "ONCE", roleTemplateCode: null,
  },
];

const notFound = () => new ApiError(404, "QUEST_NOT_FOUND", "Quest data was not found.");
const copy = <T,>(value: T): T => structuredClone(value);

export async function getMockAdminQuestCatalog(): Promise<AdminQuestBlueprints> {
  return copy({ blueprints: BLUEPRINTS });
}

export async function getMockAdminQuestDefinitions(): Promise<AdminQuestDefinitions> {
  return copy({ definitions: DEFINITIONS });
}

export async function getMockAdminQuestDefinition(questCode: string): Promise<AdminQuestDefinition> {
  const normalizedCode = normalizeAdminQuestCode(questCode);
  const definition = DEFINITIONS.find((candidate) => candidate.code === normalizedCode);
  if (!definition) throw notFound();
  return copy(definition);
}

export async function getMockAdminQuestAcceptances(questCode: string, status?: AdminQuestAcceptanceStatus | ""): Promise<AdminQuestAcceptances> {
  const normalizedCode = normalizeAdminQuestCode(questCode);
  const normalizedStatus = validateAdminQuestAcceptanceStatus(status);
  if (!DEFINITIONS.some((definition) => definition.code === normalizedCode)) throw notFound();
  return copy({ acceptances: ACCEPTANCES.filter((acceptance) => acceptance.code === normalizedCode && (!normalizedStatus || acceptance.status === normalizedStatus)) });
}

export async function getMockAdminQuestAcceptance(acceptanceId: number): Promise<AdminQuestAcceptance> {
  const normalizedId = requirePositiveAdminAcceptanceId(acceptanceId);
  const acceptance = ACCEPTANCES.find((candidate) => candidate.id === normalizedId);
  if (!acceptance) throw notFound();
  return copy(acceptance);
}
