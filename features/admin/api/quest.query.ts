import { ADMIN_QUEST_ACCEPTANCE_STATUSES } from "../quest/model";
import type { AdminQuestAcceptanceStatus } from "../quest/model";

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
