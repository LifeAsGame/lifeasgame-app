import { ADMIN_QUEST_ACCEPTANCE_STATUSES } from "../quest/model";
import type { AdminQuestAcceptance, AdminQuestAcceptanceStatus } from "../quest/model";

export function normalizeAdminQuestCode(questCode: string) {
  const normalized = questCode.trim();
  if (!normalized) throw new RangeError("questCode must not be blank.");
  return normalized;
}

export function requirePositiveAdminAcceptanceId(acceptanceId: number) {
  if (!Number.isInteger(acceptanceId) || acceptanceId < 1) throw new RangeError("acceptanceId must be a positive integer.");
  return acceptanceId;
}

export function validateAdminQuestAcceptanceStatus(status?: AdminQuestAcceptanceStatus | "") {
  if (!status) return undefined;
  if (!ADMIN_QUEST_ACCEPTANCE_STATUSES.includes(status)) throw new RangeError("status must be a canonical Acceptance status.");
  return status;
}

export function assertAdminQuestAcceptanceIdentity(
  acceptance: AdminQuestAcceptance,
  acceptanceId: number,
  questCode: string,
) {
  if (acceptance.id !== acceptanceId) throw new Error("Quest acceptance response did not match the requested Acceptance ID.");
  if (acceptance.code !== questCode) throw new Error("Quest acceptance response did not match the selected Quest code.");
  return acceptance;
}
