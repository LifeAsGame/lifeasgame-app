import { apiGet } from "@/shared/api/client";
import type {
  AdminQuestAcceptance,
  AdminQuestAcceptances,
  AdminQuestAcceptanceStatus,
  AdminQuestBlueprints,
  AdminQuestDefinition,
  AdminQuestDefinitions,
} from "../quest/model";

export const ADMIN_QUESTS_PATH = "/admin/v1/quests";

function questCodePath(questCode: string) {
  const code = questCode.trim();
  if (!code) throw new RangeError("questCode must not be blank.");
  return encodeURIComponent(code);
}

function acceptanceIdPath(acceptanceId: number) {
  if (!Number.isInteger(acceptanceId) || acceptanceId < 1) throw new RangeError("acceptanceId must be a positive integer.");
  return acceptanceId;
}

export function getAdminQuestCatalog(): Promise<AdminQuestBlueprints> {
  return apiGet(`${ADMIN_QUESTS_PATH}/catalog`);
}

export function getAdminQuestDefinitions(): Promise<AdminQuestDefinitions> {
  return apiGet(`${ADMIN_QUESTS_PATH}/definitions`);
}

export function getAdminQuestDefinition(questCode: string): Promise<AdminQuestDefinition> {
  return apiGet(`${ADMIN_QUESTS_PATH}/definitions/${questCodePath(questCode)}`);
}

export function getAdminQuestAcceptances(questCode: string, status?: AdminQuestAcceptanceStatus | ""): Promise<AdminQuestAcceptances> {
  const path = `${ADMIN_QUESTS_PATH}/${questCodePath(questCode)}/acceptances`;
  return apiGet(status ? `${path}?${new URLSearchParams({ status })}` : path);
}

export function getAdminQuestAcceptance(acceptanceId: number): Promise<AdminQuestAcceptance> {
  return apiGet(`${ADMIN_QUESTS_PATH}/acceptances/${acceptanceIdPath(acceptanceId)}`);
}
