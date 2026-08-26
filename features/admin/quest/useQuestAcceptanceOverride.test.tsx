import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminQuestCommandSource } from "../api/quest.command";
import type { AdminQuestDataSource } from "../api/quest.source";
import type { AdminQuestAcceptance } from "./model";
import {
  adminQuestOverrideRisk,
  allowedAdminQuestStatusTargets,
  useQuestAcceptanceOverride,
} from "./useQuestAcceptanceOverride";

const acceptance: AdminQuestAcceptance = {
  id: 9001, questId: 501, playerId: 10218, code: "quest:record:first-trace", title: "First Trace", category: null,
  targetType: "COUNT", targetValue: 3, progressValue: 1, status: "IN_PROGRESS", completionPolicy: "MANUAL", repeatRule: "ONCE",
  periodStart: null, periodEnd: null, acceptedAt: "2026-08-24T04:00:00Z", periodKey: null, goalReachedAt: null,
  completedAt: null, dueAt: null, semanticCategory: "RECORD", progressSource: "RECORD_CREATED", repeatPolicy: "ONCE", roleTemplateCode: null,
};

function sources() {
  const commandSource = {
    available: true,
    adjustProgress: vi.fn(),
    changeStatus: vi.fn(),
  } satisfies AdminQuestCommandSource;
  const readSource = {
    descriptor: { mode: "api", badge: "API", label: "/admin/v1", questLabel: "/admin/v1/quests" },
    getAcceptance: vi.fn(),
  } as unknown as AdminQuestDataSource;
  return { commandSource, readSource };
}

describe("Quest Acceptance override workflow", () => {
  beforeEach(() => {
    let sequence = 0;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) });
  });

  it("keeps an unresolved key through failed reload, reconcile, and manual retry", async () => {
    const { commandSource, readSource } = sources();
    commandSource.adjustProgress.mockResolvedValue(acceptance);
    vi.mocked(readSource.getAcceptance)
      .mockRejectedValueOnce(new Error("Reload unavailable"))
      .mockResolvedValueOnce(acceptance)
      .mockResolvedValueOnce({ ...acceptance, progressValue: 2 });
    const onCanonicalAcceptance = vi.fn();
    const { result } = renderHook(() => useQuestAcceptanceOverride({ acceptance, enabled: true, commandSource, readSource, onCanonicalAcceptance }));

    act(() => { result.current.beginReview({ kind: "progress", delta: 1, reason: "Verified support request" }); });
    const firstKey = result.current.intent?.idempotencyKey;
    await act(async () => { await result.current.submit(); });
    expect(result.current.phase).toBe("UNKNOWN_RESULT");
    expect(result.current.intent?.idempotencyKey).toBe(firstKey);

    await act(async () => { await result.current.reconcile(); });
    expect(result.current.phase).toBe("RECONCILED");
    await act(async () => { await result.current.submit(); });
    await waitFor(() => expect(result.current.phase).toBe("SUCCEEDED"));

    expect(commandSource.adjustProgress).toHaveBeenCalledTimes(2);
    const firstMetadata = commandSource.adjustProgress.mock.calls[0][2];
    const retryMetadata = commandSource.adjustProgress.mock.calls[1][2];
    expect(retryMetadata).toEqual(firstMetadata);
    expect(onCanonicalAcceptance).toHaveBeenLastCalledWith({ ...acceptance, progressValue: 2 });

    act(() => { result.current.newIntent(); });
    act(() => { result.current.beginReview({ kind: "progress", delta: 1, reason: "Verified support request" }); });
    expect(result.current.intent?.idempotencyKey).not.toBe(firstKey);
  });

  it("reconciles a 409 without blind retry and clears resolved intent metadata", async () => {
    const { commandSource, readSource } = sources();
    commandSource.changeStatus.mockRejectedValue(new ApiError(409, "CONFLICT", "Already applied"));
    vi.mocked(readSource.getAcceptance).mockResolvedValue({ ...acceptance, status: "GOAL_REACHED" });
    const onCanonicalAcceptance = vi.fn();
    const { result } = renderHook(() => useQuestAcceptanceOverride({ acceptance, enabled: true, commandSource, readSource, onCanonicalAcceptance }));

    act(() => { result.current.beginReview({ kind: "status", status: "GOAL_REACHED", reason: "Verified goal evidence" }); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.phase).toBe("CONFLICT_RECONCILED");
    expect(commandSource.changeStatus).toHaveBeenCalledTimes(1);
    expect(readSource.getAcceptance).toHaveBeenCalledWith(9001);
    expect(onCanonicalAcceptance).toHaveBeenCalledWith({ ...acceptance, status: "GOAL_REACHED" });
  });

  it("creates a new key only when operator intent changes", () => {
    const { commandSource, readSource } = sources();
    const { result } = renderHook(() => useQuestAcceptanceOverride({ acceptance, enabled: true, commandSource, readSource, onCanonicalAcceptance: vi.fn() }));

    act(() => { result.current.beginReview({ kind: "progress", delta: 1, reason: "Same reason" }); });
    const initialKey = result.current.intent?.idempotencyKey;
    act(() => { result.current.cancelReview(); });
    act(() => { result.current.beginReview({ kind: "progress", delta: 1, reason: "Same reason" }); });
    expect(result.current.intent?.idempotencyKey).toBe(initialKey);

    act(() => { result.current.cancelReview(); });
    act(() => { result.current.beginReview({ kind: "progress", delta: 2, reason: "Changed intent" }); });
    expect(result.current.intent?.idempotencyKey).not.toBe(initialKey);
  });

  it("clears pending command metadata on authorization failure", async () => {
    const { commandSource, readSource } = sources();
    commandSource.adjustProgress.mockRejectedValue(new ApiError(403, "FORBIDDEN", "Admin access denied"));
    const { result } = renderHook(() => useQuestAcceptanceOverride({ acceptance, enabled: true, commandSource, readSource, onCanonicalAcceptance: vi.fn() }));

    act(() => { result.current.beginReview({ kind: "progress", delta: 1, reason: "Verified support request" }); });
    expect(result.current.intent).not.toBeNull();
    await act(async () => { await result.current.submit(); });

    expect(result.current.phase).toBe("IDLE");
    expect(result.current.intent).toBeNull();
    expect(result.current.receipt).toBeNull();
    expect(result.current.error?.status).toBe(403);
  });

  it("applies exact risk and transition rules", () => {
    expect(adminQuestOverrideRisk(acceptance, { kind: "progress", delta: 1, reason: "Below" })).toBe("L2");
    expect(adminQuestOverrideRisk(acceptance, { kind: "progress", delta: 2, reason: "Reaches" })).toBe("L3");
    expect(adminQuestOverrideRisk(acceptance, { kind: "status", status: "GOAL_REACHED", reason: "Goal" })).toBe("L2");
    expect(adminQuestOverrideRisk(acceptance, { kind: "status", status: "COMPLETED", reason: "Complete" })).toBe("L3");
    expect(adminQuestOverrideRisk(acceptance, { kind: "status", status: "CANCELED", reason: "Cancel" })).toBe("L3");
    expect(allowedAdminQuestStatusTargets("IN_PROGRESS")).toEqual(["GOAL_REACHED", "CANCELED"]);
    expect(allowedAdminQuestStatusTargets("GOAL_REACHED")).toEqual(["COMPLETED", "CANCELED"]);
    expect(allowedAdminQuestStatusTargets("COMPLETED")).toEqual([]);
    expect(allowedAdminQuestStatusTargets("CANCELED")).toEqual([]);
  });
});
