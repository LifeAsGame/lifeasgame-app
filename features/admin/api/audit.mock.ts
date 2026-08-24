import type { AdminAuditEvent, AdminAuditPage, AdminAuditQuery } from "../model";

const EVENTS: AdminAuditEvent[] = [
  { id: 108, actorUserId: 12, action: "USER_STATUS_CHANGE", targetType: "USER", targetId: "USR-108", reason: "Support review completed", result: "SUCCESS", correlationId: "COR-AUD-108", idempotencyKey: "IDEMP-AUD-108", occurredAt: "2026-08-25T08:30:00.000Z" },
  { id: 107, actorUserId: 21, action: "WALLET_ADJUSTMENT", targetType: "WALLET", targetId: "WAL-207", reason: "Approved balance correction", result: "SUCCESS", correlationId: "COR-AUD-107", idempotencyKey: "IDEMP-AUD-107", occurredAt: "2026-08-25T07:15:00.000Z" },
  { id: 106, actorUserId: 12, action: "QUEST_STATUS_CHANGE", targetType: "QUEST", targetId: "QUEST-306", reason: "Rejected stale transition", result: "FAILED", correlationId: "COR-AUD-106", idempotencyKey: null, occurredAt: "2026-08-25T06:00:00.000Z" },
  { id: 105, actorUserId: 34, action: "CONTENT_DEFINITION_UPDATE", targetType: "CONTENT", targetId: "DEF-405", reason: null, result: "SUCCESS", correlationId: "COR-AUD-105", idempotencyKey: "IDEMP-AUD-105", occurredAt: "2026-08-24T18:45:00.000Z" },
  { id: 104, actorUserId: 21, action: "USER_STATUS_CHANGE", targetType: "USER", targetId: "USR-104", reason: "Request failed validation", result: "FAILED", correlationId: "COR-AUD-104", idempotencyKey: null, occurredAt: "2026-08-24T16:30:00.000Z" },
  { id: 103, actorUserId: 34, action: "QUEST_STATUS_CHANGE", targetType: "QUEST", targetId: "QUEST-303", reason: "Approved operator correction", result: "SUCCESS", correlationId: "COR-AUD-103", idempotencyKey: "IDEMP-AUD-103", occurredAt: "2026-08-24T14:00:00.000Z" },
  { id: 102, actorUserId: 12, action: "WALLET_ADJUSTMENT", targetType: "WALLET", targetId: "WAL-202", reason: "Duplicate request rejected", result: "FAILED", correlationId: "COR-AUD-102", idempotencyKey: "IDEMP-AUD-102", occurredAt: "2026-08-24T11:20:00.000Z" },
  { id: 101, actorUserId: 21, action: "CONTENT_DEFINITION_UPDATE", targetType: "CONTENT", targetId: "DEF-401", reason: "Definition metadata updated", result: "SUCCESS", correlationId: "COR-AUD-101", idempotencyKey: null, occurredAt: "2026-08-24T09:10:00.000Z" },
];

const value = (input?: string) => input?.trim() || undefined;

function cursorOffset(cursor?: string) {
  if (!cursor) return 0;
  const match = /^mock:(\d+)$/.exec(cursor);
  if (!match) throw new RangeError("Mock Audit cursor is invalid.");
  return Number(match[1]);
}

export async function getMockAdminAuditEvents(query: AdminAuditQuery = {}): Promise<AdminAuditPage> {
  const from = value(query.from) ? Date.parse(query.from!) : Number.NEGATIVE_INFINITY;
  const to = value(query.to) ? Date.parse(query.to!) : Number.POSITIVE_INFINITY;
  const filtered = EVENTS
    .filter((event) => query.actorUserId === undefined || event.actorUserId === query.actorUserId)
    .filter((event) => !value(query.action) || event.action === value(query.action))
    .filter((event) => !value(query.targetType) || event.targetType === value(query.targetType))
    .filter((event) => !value(query.targetId) || event.targetId === value(query.targetId))
    .filter((event) => !query.result || event.result === query.result)
    .filter((event) => !value(query.correlationId) || event.correlationId === value(query.correlationId))
    .filter((event) => Date.parse(event.occurredAt) >= from && Date.parse(event.occurredAt) < to)
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt) || right.id - left.id);
  const offset = cursorOffset(query.cursor);
  const size = query.size === undefined || !Number.isFinite(query.size) ? 50 : Math.min(100, Math.max(1, Math.trunc(query.size)));
  const items = filtered.slice(offset, offset + size);
  return { items, nextCursor: offset + items.length < filtered.length ? `mock:${offset + items.length}` : null };
}
