import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "@/shared/api/client";
import {
  adjustAdminQuestAcceptanceProgress,
  changeAdminQuestAcceptanceStatus,
  getAdminQuestCommandSource,
  validateAdminQuestOverrideReason,
} from "./quest.command";

vi.mock("@/shared/api/client", () => ({ apiPatch: vi.fn() }));

describe("Admin Quest command adapter", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends the exact progress and status contracts without automatic retry", async () => {
    vi.mocked(client.apiPatch).mockResolvedValue({});

    await adjustAdminQuestAcceptanceProgress(9001, { delta: 2, reason: "Support case 42" }, {
      idempotencyKey: "quest-override:key-1",
      correlationId: "quest-operation:correlation-1",
    });
    await changeAdminQuestAcceptanceStatus(9001, { status: "COMPLETED", reason: "Verified target state" }, {
      idempotencyKey: "quest-override:key-2",
    });

    expect(client.apiPatch).toHaveBeenNthCalledWith(1,
      "/admin/v1/quests/acceptances/9001/progress",
      { delta: 2, reason: "Support case 42" },
      { headers: { "Idempotency-Key": "quest-override:key-1", "X-Correlation-Id": "quest-operation:correlation-1" }, retry: false },
    );
    expect(client.apiPatch).toHaveBeenNthCalledWith(2,
      "/admin/v1/quests/acceptances/9001/status",
      { status: "COMPLETED", reason: "Verified target state" },
      { headers: { "Idempotency-Key": "quest-override:key-2" }, retry: false },
    );
    expect(client.apiPatch).not.toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/"), expect.anything(), expect.anything());
  });

  it("rejects legacy and unsafe values before transport", () => {
    expect(() => changeAdminQuestAcceptanceStatus(9001, { status: "DONE" as "COMPLETED", reason: "Legacy" }, { idempotencyKey: "key" })).toThrow("allowed Acceptance command target");
    expect(() => adjustAdminQuestAcceptanceProgress(9001, { delta: 0.5, reason: "Fraction" }, { idempotencyKey: "key" })).toThrow("non-negative integer");
    expect(() => validateAdminQuestOverrideReason("")).toThrow("visible, single-line");
    expect(() => validateAdminQuestOverrideReason("line one\nline two")).toThrow("visible, single-line");
    expect(() => validateAdminQuestOverrideReason("\u200b")).toThrow("visible, single-line");
    expect(client.apiPatch).not.toHaveBeenCalled();
  });

  it("keeps Mock reads available without exposing a fake command", () => {
    expect(getAdminQuestCommandSource("mock")).toEqual({ available: false });
    expect(getAdminQuestCommandSource("api")).toMatchObject({ available: true });
    expect(getAdminQuestCommandSource("invalid")).toMatchObject({ available: true });
  });
});
