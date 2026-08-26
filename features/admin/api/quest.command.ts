import { apiPatch } from "@/shared/api/client";
import type { AdminQuestAcceptance, AdminQuestAcceptanceStatus } from "../quest/model";
import { requirePositiveAdminAcceptanceId } from "./quest.query";
import { resolveAdminDataSourceMode } from "./source";

const SAFE_HEADER_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const UNSAFE_REASON_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const VISIBLE_REASON_CHARACTER = /[^\p{Cf}\p{Zs}]/u;

export const ADMIN_QUEST_STATUS_COMMANDS = ["GOAL_REACHED", "COMPLETED", "CANCELED"] as const;
export type AdminQuestStatusCommand = Extract<AdminQuestAcceptanceStatus, typeof ADMIN_QUEST_STATUS_COMMANDS[number]>;

export type AdminQuestCommandMetadata = {
  idempotencyKey: string;
  correlationId?: string;
};

export type AdminQuestProgressCommand = {
  delta: number;
  reason: string;
};

export type AdminQuestStatusCommandBody = {
  status: AdminQuestStatusCommand;
  reason: string;
};

function validateHeaderValue(value: string, name: string, maxLength: number) {
  if (value.length > maxLength || !SAFE_HEADER_VALUE.test(value)) {
    throw new RangeError(`${name} must use the backend-safe identifier format.`);
  }
  return value;
}

export function validateAdminQuestOverrideReason(reason: string) {
  if (reason.length < 1 || reason.length > 512 || UNSAFE_REASON_CHARACTER.test(reason) || !VISIBLE_REASON_CHARACTER.test(reason)) {
    throw new RangeError("Reason must be 1–512 visible, single-line characters without control or formatting characters.");
  }
  return reason.trim();
}

function commandOptions({ idempotencyKey, correlationId }: AdminQuestCommandMetadata) {
  const headers: Record<string, string> = {
    "Idempotency-Key": validateHeaderValue(idempotencyKey, "Idempotency-Key", 128),
  };
  if (correlationId) headers["X-Correlation-Id"] = validateHeaderValue(correlationId, "X-Correlation-Id", 100);
  return { headers, retry: false } as const;
}

export function adjustAdminQuestAcceptanceProgress(
  acceptanceId: number,
  body: AdminQuestProgressCommand,
  metadata: AdminQuestCommandMetadata,
): Promise<AdminQuestAcceptance> {
  if (!Number.isInteger(body.delta) || body.delta < 0) throw new RangeError("Progress delta must be a non-negative integer.");
  return apiPatch(
    `/admin/v1/quests/acceptances/${requirePositiveAdminAcceptanceId(acceptanceId)}/progress`,
    { delta: body.delta, reason: validateAdminQuestOverrideReason(body.reason) },
    commandOptions(metadata),
  );
}

export function changeAdminQuestAcceptanceStatus(
  acceptanceId: number,
  body: AdminQuestStatusCommandBody,
  metadata: AdminQuestCommandMetadata,
): Promise<AdminQuestAcceptance> {
  if (!ADMIN_QUEST_STATUS_COMMANDS.includes(body.status)) throw new RangeError("Status must be an allowed Acceptance command target.");
  return apiPatch(
    `/admin/v1/quests/acceptances/${requirePositiveAdminAcceptanceId(acceptanceId)}/status`,
    { status: body.status, reason: validateAdminQuestOverrideReason(body.reason) },
    commandOptions(metadata),
  );
}

export type AdminQuestCommandSource =
  | {
    available: true;
    adjustProgress: typeof adjustAdminQuestAcceptanceProgress;
    changeStatus: typeof changeAdminQuestAcceptanceStatus;
  }
  | { available: false };

const API_COMMAND_SOURCE: AdminQuestCommandSource = {
  available: true,
  adjustProgress: adjustAdminQuestAcceptanceProgress,
  changeStatus: changeAdminQuestAcceptanceStatus,
};

const UNAVAILABLE_COMMAND_SOURCE: AdminQuestCommandSource = { available: false };

export function getAdminQuestCommandSource(value: unknown): AdminQuestCommandSource {
  return resolveAdminDataSourceMode(value) === "mock" ? UNAVAILABLE_COMMAND_SOURCE : API_COMMAND_SOURCE;
}

export const adminQuestCommandSource = getAdminQuestCommandSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
