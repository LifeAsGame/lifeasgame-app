import { apiGet } from "@/shared/api/client";
import type {
  AdminQuestAcceptance,
  AdminQuestAcceptances,
  AdminQuestAcceptanceStatus,
  AdminQuestBlueprints,
  AdminQuestDefinition,
  AdminQuestDefinitions,
} from "../quest/model";
import {
  normalizeAdminQuestCode,
  requirePositiveAdminAcceptanceId,
  validateAdminQuestAcceptanceStatus,
} from "./quest.query";

export const ADMIN_QUESTS_PATH = "/admin/v1/quests";

export function getAdminQuestCatalog(): Promise<AdminQuestBlueprints> {
  return apiGet(`${ADMIN_QUESTS_PATH}/catalog`);
}

export function getAdminQuestDefinitions(): Promise<AdminQuestDefinitions> {
  return apiGet(`${ADMIN_QUESTS_PATH}/definitions`);
}

export async function getAdminQuestDefinition(questCode: string): Promise<AdminQuestDefinition> {
  return apiGet(`${ADMIN_QUESTS_PATH}/definitions/${encodeURIComponent(normalizeAdminQuestCode(questCode))}`);
}

export async function getAdminQuestAcceptances(questCode: string, status?: AdminQuestAcceptanceStatus | ""): Promise<AdminQuestAcceptances> {
  const path = `${ADMIN_QUESTS_PATH}/${encodeURIComponent(normalizeAdminQuestCode(questCode))}/acceptances`;
  const normalizedStatus = validateAdminQuestAcceptanceStatus(status);
  return apiGet(normalizedStatus ? `${path}?${new URLSearchParams({ status: normalizedStatus })}` : path);
}

export async function getAdminQuestAcceptance(acceptanceId: number): Promise<AdminQuestAcceptance> {
  return apiGet(`${ADMIN_QUESTS_PATH}/acceptances/${requirePositiveAdminAcceptanceId(acceptanceId)}`);
}
