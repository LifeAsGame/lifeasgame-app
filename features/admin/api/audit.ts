import { apiGet } from "@/shared/api/client";
import type { AdminAuditPage, AdminAuditQuery } from "../model";
import { normalizeAdminAuditQuery } from "./audit.query";

export const ADMIN_AUDIT_PATH = "/admin/v1/audit-events";

export async function getAdminAuditEvents(input: AdminAuditQuery = {}): Promise<AdminAuditPage> {
  const query = normalizeAdminAuditQuery(input);
  const params = new URLSearchParams();

  if (query.actorUserId !== undefined) params.set("actorUserId", String(query.actorUserId));
  if (query.action) params.set("action", query.action);
  if (query.targetType) params.set("targetType", query.targetType);
  if (query.targetId) params.set("targetId", query.targetId);
  if (query.result) params.set("result", query.result);
  if (query.correlationId) params.set("correlationId", query.correlationId);
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.size !== undefined) params.set("size", String(query.size));

  const search = params.toString();
  return apiGet<AdminAuditPage>(search ? `${ADMIN_AUDIT_PATH}?${search}` : ADMIN_AUDIT_PATH);
}
