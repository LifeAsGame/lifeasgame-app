import type { AdminAuditQuery } from "../model";

const CODE = /^[A-Z][A-Z0-9_]{2,63}$/;
const TARGET_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

function text(value?: string) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function validatedText(key: string, value: string | undefined, pattern: RegExp) {
  const normalized = text(value);
  if (normalized && !pattern.test(normalized)) throw new RangeError(`${key} has an invalid format.`);
  return normalized;
}

function validatedDate(key: string, value?: string) {
  const normalized = text(value);
  if (normalized && Number.isNaN(Date.parse(normalized))) throw new RangeError(`${key} has an invalid date.`);
  return normalized;
}

export function normalizeAdminAuditQuery(query: AdminAuditQuery = {}): AdminAuditQuery {
  if (query.actorUserId !== undefined && (!Number.isInteger(query.actorUserId) || query.actorUserId < 1)) {
    throw new RangeError("actorUserId must be a positive integer.");
  }
  if (query.result !== undefined && query.result !== "SUCCESS" && query.result !== "FAILED") {
    throw new RangeError("result must be SUCCESS or FAILED.");
  }
  if (query.cursor !== undefined && query.cursor.length > 256) {
    throw new RangeError("cursor exceeds the supported length.");
  }

  const action = validatedText("action", query.action, CODE);
  const targetType = validatedText("targetType", query.targetType, CODE);
  const targetId = validatedText("targetId", query.targetId, TARGET_ID);
  const correlationId = validatedText("correlationId", query.correlationId, CORRELATION_ID);
  const from = validatedDate("from", query.from);
  const to = validatedDate("to", query.to);

  return {
    ...(query.actorUserId !== undefined ? { actorUserId: query.actorUserId } : {}),
    ...(action ? { action } : {}),
    ...(targetType ? { targetType } : {}),
    ...(targetId ? { targetId } : {}),
    ...(query.result ? { result: query.result } : {}),
    ...(correlationId ? { correlationId } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(query.cursor ? { cursor: query.cursor } : {}),
    ...(query.size !== undefined
      ? { size: Number.isFinite(query.size) ? Math.min(100, Math.max(1, Math.trunc(query.size))) : 50 }
      : {}),
  };
}
