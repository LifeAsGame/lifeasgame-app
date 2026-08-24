import { apiGet } from "@/shared/api/client";
import type { AdminAuditPage, AdminAuditQuery } from "../model";

export const ADMIN_AUDIT_PATH = "/admin/v1/audit-events";

const CODE = /^[A-Z][A-Z0-9_]{2,63}$/;
const TARGET_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const CORRELATION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/;

function normalized(value?: string) {
  const next = value?.trim();
  return next || undefined;
}

function appendValidated(params: URLSearchParams, key: string, value: string | undefined, pattern: RegExp) {
  const next = normalized(value);
  if (!next) return;
  if (!pattern.test(next)) throw new RangeError(`${key} has an invalid format.`);
  params.set(key, next);
}

export function getAdminAuditEvents(query: AdminAuditQuery = {}): Promise<AdminAuditPage> {
  const params = new URLSearchParams();

  if (query.actorUserId !== undefined) {
    if (!Number.isInteger(query.actorUserId) || query.actorUserId < 1) {
      throw new RangeError("actorUserId must be a positive integer.");
    }
    params.set("actorUserId", String(query.actorUserId));
  }

  appendValidated(params, "action", query.action, CODE);
  appendValidated(params, "targetType", query.targetType, CODE);
  appendValidated(params, "targetId", query.targetId, TARGET_ID);
  if (query.result) params.set("result", query.result);
  appendValidated(params, "correlationId", query.correlationId, CORRELATION_ID);
  if (normalized(query.from)) params.set("from", query.from!.trim());
  if (normalized(query.to)) params.set("to", query.to!.trim());

  if (query.cursor !== undefined && query.cursor !== "") {
    if (query.cursor.length > 256) throw new RangeError("cursor exceeds the supported length.");
    params.set("cursor", query.cursor);
  }

  if (query.size !== undefined) {
    const size = Number.isFinite(query.size) ? Math.min(100, Math.max(1, Math.trunc(query.size))) : 50;
    params.set("size", String(size));
  }

  const search = params.toString();
  return apiGet<AdminAuditPage>(search ? `${ADMIN_AUDIT_PATH}?${search}` : ADMIN_AUDIT_PATH);
}
