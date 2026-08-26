import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import type { AdminInventoryOperationsDataSource, AdminItemDetail } from "../api/inventory.source";
import type { AdminAuditEvent } from "../model";
import { useInventoryMailboxOperations } from "./useInventoryMailboxOperations";

const item: AdminItemDetail = { id: 1201, code: "HEALTH_POTION", name: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, maxDurability: null, baseAttrs: {} };
const inventory = { playerId: 10218, entries: [] };
const mailbox = { playerId: 10218, entries: [] };

function sources() {
  const readSource: AdminInventoryOperationsDataSource = {
    descriptor: { mode: "api", badge: "API", label: "/admin/v1", inventoryLabel: "/admin/v1/items" },
    searchItems: vi.fn(), getItem: vi.fn(), getInventory: vi.fn().mockResolvedValue(inventory), getMailbox: vi.fn().mockResolvedValue(mailbox),
  };
  const commandSource: Extract<AdminInventoryOperationsCommandSource, { available: true }> = {
    available: true, addInventory: vi.fn(), deliverMailbox: vi.fn(),
  };
  const auditSource: AdminAuditDataSource = {
    descriptor: { mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" },
    getEvents: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  };
  return { readSource, commandSource, auditSource };
}

function successAudit(intent: NonNullable<ReturnType<typeof useInventoryMailboxOperations>["intent"]>, overrides: Partial<AdminAuditEvent> = {}): AdminAuditEvent {
  return {
    id: 1,
    actorUserId: 12,
    action: intent.destination === "INVENTORY" ? "INVENTORY_ITEM_ADD" : "MAILBOX_ITEM_DELIVERY",
    targetType: intent.destination === "INVENTORY" ? "PLAYER_INVENTORY" : "PLAYER_MAILBOX",
    targetId: String(intent.playerId),
    reason: intent.reason,
    result: "SUCCESS",
    correlationId: intent.correlationId,
    idempotencyKey: intent.idempotencyKey,
    occurredAt: "2026-08-26T01:00:00Z",
    ...overrides,
  };
}

function setup(sourceOverrides: Partial<ReturnType<typeof sources>> = {}, selectedItem: AdminItemDetail | null = item) {
  const defaults = sources();
  const all = { ...defaults, ...sourceOverrides };
  const onCanonicalInventory = vi.fn();
  const onCanonicalMailbox = vi.fn();
  const hook = renderHook(() => useInventoryMailboxOperations({
    playerId: 10218,
    playerName: "HANEUL",
    item: selectedItem,
    enabled: true,
    ...all,
    onCanonicalInventory,
    onCanonicalMailbox,
  }));
  return { ...all, ...hook, onCanonicalInventory, onCanonicalMailbox };
}

function inventoryDraft(overrides = {}) {
  return { destination: "INVENTORY" as const, itemId: 1201, quantity: 2, bound: false, reason: "Verified support request", ...overrides };
}

describe("Player Inventory and Mailbox operation workflow", () => {
  beforeEach(() => {
    let sequence = 0;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) });
  });

  it("requires exact Item detail and creates stable identity per unchanged L2 intent", () => {
    const withoutItem = setup({}, null);
    expect(withoutItem.result.current.beginReview(inventoryDraft())).toBe(false);

    const { result } = setup();
    expect(() => result.current.beginReview(inventoryDraft({ itemId: 9999 }))).toThrow("Exact Item detail");
    act(() => { result.current.beginReview(inventoryDraft()); });
    const first = result.current.intent;
    expect(result.current.phase).toBe("REVIEWING");
    act(() => { result.current.cancelReview(); });
    act(() => { result.current.beginReview(inventoryDraft()); });
    expect(result.current.intent?.idempotencyKey).toBe(first?.idempotencyKey);
    expect(result.current.intent?.correlationId).toBe(first?.correlationId);
    act(() => { result.current.cancelReview(); });
    act(() => { result.current.beginReview(inventoryDraft({ quantity: 3 })); });
    expect(result.current.intent?.idempotencyKey).not.toBe(first?.idempotencyKey);
    expect(result.current.intent?.correlationId).not.toBe(first?.correlationId);
  });

  it("guards duplicate submit and completes only after exact canonical reload", async () => {
    const { result, commandSource, readSource, onCanonicalInventory } = setup();
    let resolveCommand!: () => void;
    vi.mocked(commandSource.addInventory).mockReturnValue(new Promise((resolve) => { resolveCommand = () => resolve({ slots: [1] }); }));
    let resolveReload!: () => void;
    vi.mocked(readSource.getInventory).mockReturnValue(new Promise((resolve) => { resolveReload = () => resolve(inventory); }));
    act(() => { result.current.beginReview(inventoryDraft()); });
    act(() => { void result.current.submit(); void result.current.submit(); });
    expect(commandSource.addInventory).toHaveBeenCalledTimes(1);
    expect(onCanonicalInventory).not.toHaveBeenCalled();
    await act(async () => { resolveCommand(); });
    expect(result.current.phase).toBe("SUCCEEDED_RELOADING");
    expect(onCanonicalInventory).not.toHaveBeenCalled();
    await act(async () => { resolveReload(); });
    await waitFor(() => expect(result.current.phase).toBe("SUCCEEDED"));
    expect(onCanonicalInventory).toHaveBeenCalledWith(inventory);
  });

  it("keeps command success UNKNOWN when canonical Player identity mismatches", async () => {
    const all = sources();
    all.commandSource.addInventory = vi.fn().mockResolvedValue({ slots: [1] });
    all.readSource.getInventory = vi.fn().mockResolvedValue({ playerId: 99999, entries: [] });
    const { result } = setup(all);
    act(() => { result.current.beginReview(inventoryDraft()); });
    await act(async () => { await result.current.submit(); });
    expect(result.current.phase).toBe("UNKNOWN_RESULT");
    expect(result.current.intent).not.toBeNull();
    expect(result.current.receipt).toBeNull();
  });

  it("attributes UNKNOWN only to exact Audit and can prove success with a stale destination warning", async () => {
    const all = sources();
    all.commandSource.deliverMailbox = vi.fn().mockRejectedValue(new Error("Connection lost"));
    all.readSource.getMailbox = vi.fn().mockRejectedValue(new Error("Mailbox reload unavailable"));
    const { result, auditSource } = setup(all);
    act(() => { result.current.beginReview({ destination: "MAILBOX", itemId: 1201, quantity: 1, bound: true, reason: "Approved delivery" }); });
    const intent = result.current.intent!;
    vi.mocked(auditSource.getEvents).mockResolvedValue({ items: [successAudit(intent)], nextCursor: null });
    await act(async () => { await result.current.submit(); });
    expect(result.current.phase).toBe("UNKNOWN_RESULT");
    await act(async () => { await result.current.reconcile(); });
    expect(result.current.phase).toBe("SUCCEEDED");
    expect(result.current.receipt).toMatchObject({ destinationStale: true, evidence: "AUDIT" });
    expect(auditSource.getEvents).toHaveBeenCalledWith({ action: "MAILBOX_ITEM_DELIVERY", targetType: "PLAYER_MAILBOX", targetId: "10218", result: "SUCCESS", correlationId: intent.correlationId });
  });

  it("never attributes success from destination list shape without exact Audit", async () => {
    const all = sources();
    all.commandSource.addInventory = vi.fn().mockRejectedValue(new Error("Connection lost"));
    all.readSource.getInventory = vi.fn().mockResolvedValue({ playerId: 10218, entries: [{ itemInstanceId: 99, slotIndex: 1, itemId: 1201, itemName: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, quantity: 2, bound: false, durability: null }] });
    const { result } = setup(all);
    act(() => { result.current.beginReview(inventoryDraft()); });
    await act(async () => { await result.current.submit(); });
    await act(async () => { await result.current.reconcile(); });
    expect(result.current.phase).toBe("RECONCILED_RETRYABLE");
    expect(result.current.receipt).toBeNull();
  });

  it("keeps UNKNOWN and blocks retry when Audit cannot be read", async () => {
    const all = sources();
    all.commandSource.addInventory = vi.fn().mockRejectedValue(new Error("Connection lost"));
    all.auditSource.getEvents = vi.fn().mockRejectedValue(new Error("Audit unavailable"));
    const { result } = setup(all);
    act(() => { result.current.beginReview(inventoryDraft()); });
    await act(async () => { await result.current.submit(); });
    await act(async () => { await result.current.reconcile(); });
    expect(result.current.phase).toBe("UNKNOWN_RESULT");
    expect(result.current.receipt).toBeNull();
  });

  it("reconciles 409 with exact Audit and rejects same-player wrong operation identities", async () => {
    const success = sources();
    success.commandSource.addInventory = vi.fn().mockRejectedValue(new ApiError(409, "CONFLICT", "Already applied"));
    const successfulHook = setup(success);
    act(() => { successfulHook.result.current.beginReview(inventoryDraft()); });
    const exactIntent = successfulHook.result.current.intent!;
    vi.mocked(successfulHook.auditSource.getEvents).mockResolvedValue({ items: [successAudit(exactIntent)], nextCursor: null });
    await act(async () => { await successfulHook.result.current.submit(); });
    expect(successfulHook.result.current.phase).toBe("SUCCEEDED");

    const conflict = sources();
    conflict.commandSource.addInventory = vi.fn().mockRejectedValue(new ApiError(409, "CONFLICT", "Already applied"));
    const conflictHook = setup(conflict);
    act(() => { conflictHook.result.current.beginReview(inventoryDraft()); });
    const intent = conflictHook.result.current.intent!;
    vi.mocked(conflictHook.auditSource.getEvents).mockResolvedValue({ items: [
      successAudit(intent, { action: "MAILBOX_ITEM_DELIVERY" }),
      successAudit(intent, { correlationId: "admin-operation:other" }),
      successAudit(intent, { idempotencyKey: "entitlement:other" }),
    ], nextCursor: null });
    await act(async () => { await conflictHook.result.current.submit(); });
    expect(conflictHook.result.current.phase).toBe("CONFLICT_RECONCILED");
    expect(conflictHook.result.current.receipt).toBeNull();
  });
});
