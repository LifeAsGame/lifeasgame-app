import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAuditQuery } from "../model";
import { getAdminAuditEvents } from "./audit";

const client = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/shared/api/client", () => client);

describe("canonical Admin Audit adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({ items: [], nextCursor: null });
  });

  it("uses only the canonical endpoint and omits empty filters", async () => {
    await getAdminAuditEvents();
    await getAdminAuditEvents({ action: " ", targetId: "", correlationId: "  " });

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/admin/v1/audit-events");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/admin/v1/audit-events");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toContain("/api/v1/admin/");
  });

  it("serializes every supported filter and forwards the cursor as opaque data", async () => {
    await getAdminAuditEvents({
      actorUserId: 17,
      action: " PLAYER_STATUS_REVIEW ",
      targetType: "PLAYER",
      targetId: "PLR-001:live",
      result: "FAILED",
      correlationId: "COR.2026-08-25",
      from: "2026-08-24T00:00:00.000Z",
      to: "2026-08-25T00:00:00.000Z",
      cursor: "opaque+/=cursor:value",
      size: 75,
    });

    const path = client.apiGet.mock.calls[0][0] as string;
    const url = new URL(path, "https://example.test");
    expect(url.pathname).toBe("/admin/v1/audit-events");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      actorUserId: "17",
      action: "PLAYER_STATUS_REVIEW",
      targetType: "PLAYER",
      targetId: "PLR-001:live",
      result: "FAILED",
      correlationId: "COR.2026-08-25",
      from: "2026-08-24T00:00:00.000Z",
      to: "2026-08-25T00:00:00.000Z",
      cursor: "opaque+/=cursor:value",
      size: "75",
    });
  });

  it("bounds size to the backend 1..100 contract", async () => {
    await getAdminAuditEvents({ size: 0 });
    await getAdminAuditEvents({ size: 101 });

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/admin/v1/audit-events?size=1");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/admin/v1/audit-events?size=100");
  });

  it.each<[AdminAuditQuery, string]>([
    [{ actorUserId: -1 }, "positive integer"],
    [{ action: "invalid-action" }, "action has an invalid format"],
    [{ targetType: "invalid type" }, "targetType has an invalid format"],
    [{ targetId: "-invalid" }, "targetId has an invalid format"],
    [{ correlationId: "invalid value" }, "correlationId has an invalid format"],
    [{ result: "UNKNOWN" as "SUCCESS" }, "result must be SUCCESS or FAILED"],
    [{ from: "not-a-date" }, "from has an invalid date"],
    [{ to: "not-a-date" }, "to has an invalid date"],
    [{ cursor: "x".repeat(257) }, "cursor exceeds the supported length"],
  ])("rejects an invalid shared query through its Promise contract: %o", async (query, message) => {
    const result = getAdminAuditEvents(query);

    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow(message);
    expect(client.apiGet).not.toHaveBeenCalled();
  });
});
