import { describe, expect, it } from "vitest";

import { getMockAdminAuditEvents } from "./audit.mock";

describe("read-only Admin Audit mock adapter", () => {
  it("returns deterministic newest-first pages with opaque next cursors", async () => {
    const first = await getMockAdminAuditEvents({ size: 2 });
    const second = await getMockAdminAuditEvents({ size: 2, cursor: first.nextCursor! });

    expect(first.items.map(({ id }) => id)).toEqual([108, 107]);
    expect(first.nextCursor).toBe("mock:2");
    expect(second.items.map(({ id }) => id)).toEqual([106, 105]);
    expect(second.nextCursor).toBe("mock:4");
  });

  it("supports the shared Audit filters and exclusive upper time bound", async () => {
    const result = await getMockAdminAuditEvents({
      actorUserId: 12,
      action: "QUEST_STATUS_CHANGE",
      targetType: "QUEST",
      targetId: "QUEST-306",
      result: "FAILED",
      correlationId: "COR-AUD-106",
      from: "2026-08-25T06:00:00.000Z",
      to: "2026-08-25T07:00:00.000Z",
      size: 25,
    });

    expect(result).toEqual({ items: [expect.objectContaining({ id: 106 })], nextCursor: null });
    const before = await getMockAdminAuditEvents({ to: "2026-08-25T06:00:00.000Z" });
    expect(before.items.some(({ id }) => id === 106)).toBe(false);
  });

  it("contains only the shared safe Audit fields and rejects non-mock cursors", async () => {
    const page = await getMockAdminAuditEvents({ size: 1 });
    expect(Object.keys(page.items[0])).toEqual([
      "id", "actorUserId", "action", "targetType", "targetId", "reason", "result", "correlationId", "idempotencyKey", "occurredAt",
    ]);
    expect(page.items[0]).not.toHaveProperty("requestBody");
    expect(page.items[0]).not.toHaveProperty("responseBody");
    expect(page.items[0]).not.toHaveProperty("token");
    await expect(getMockAdminAuditEvents({ cursor: "2" })).rejects.toThrow("cursor is invalid");
  });
});
