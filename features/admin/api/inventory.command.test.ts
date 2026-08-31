import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "@/shared/api/client";
import {
  addAdminPlayerInventory,
  deliverAdminPlayerMailbox,
  getAdminInventoryOperationsCommandSource,
  validateAdminEntitlementReason,
} from "./inventory.command";

vi.mock("@/shared/api/client", () => ({ apiPost: vi.fn() }));

describe("Admin Inventory operations command source", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.mocked(client.apiPost).mockResolvedValue({}); });

  it("sends only the exact two POST contracts with required identity and no retry", async () => {
    const inventoryBody = { itemId: 1201, quantity: 3, bound: false, reason: "Verified support case" };
    const mailboxBody = { itemId: 3307, quantity: 1, bound: true, reason: "Approved delivery" };
    await addAdminPlayerInventory(10218, inventoryBody, { idempotencyKey: "entitlement:key-1", correlationId: "admin-operation:one" });
    await deliverAdminPlayerMailbox(10218, mailboxBody, { idempotencyKey: "entitlement:key-2" });

    expect(client.apiPost).toHaveBeenNthCalledWith(1, "/admin/v1/players/10218/inventory/add", inventoryBody, { headers: { "Idempotency-Key": "entitlement:key-1", "X-Correlation-Id": "admin-operation:one" }, retry: false });
    expect(client.apiPost).toHaveBeenNthCalledWith(2, "/admin/v1/players/10218/mailbox/deliver", mailboxBody, { headers: { "Idempotency-Key": "entitlement:key-2" }, retry: false });
    expect(JSON.stringify(vi.mocked(client.apiPost).mock.calls)).not.toContain("instanceAttrs");
  });

  it("rebuilds the transport body from canonical fields only", async () => {
    const legacy = { itemId: 1201, quantity: 1, bound: false, reason: "Exact body", ["instance" + "Attrs"]: { attack: 99 } };
    await addAdminPlayerInventory(10218, legacy, { idempotencyKey: "entitlement:key" });
    expect(client.apiPost).toHaveBeenCalledWith(expect.any(String), { itemId: 1201, quantity: 1, bound: false, reason: "Exact body" }, expect.any(Object));
  });

  it("rejects invalid quantity, reason, and operation identifiers before transport", async () => {
    expect(() => addAdminPlayerInventory(10218, { itemId: 1201, quantity: 0, bound: false, reason: "Reason" }, { idempotencyKey: "key" })).toThrow("positive integer");
    expect(() => validateAdminEntitlementReason("")).toThrow("visible, single-line");
    expect(() => validateAdminEntitlementReason("line one\nline two")).toThrow("visible, single-line");
    expect(() => validateAdminEntitlementReason("\u202ehidden")).toThrow("visible, single-line");
    expect(() => deliverAdminPlayerMailbox(10218, { itemId: 1201, quantity: 1, bound: false, reason: "Reason" }, { idempotencyKey: "unsafe key" })).toThrow("backend-safe identifier");
    expect(client.apiPost).not.toHaveBeenCalled();
  });

  it("makes commands unavailable in Mock mode without fake success", () => {
    expect(getAdminInventoryOperationsCommandSource("mock")).toEqual({ available: false });
    expect(getAdminInventoryOperationsCommandSource("api")).toMatchObject({ available: true });
    expect(getAdminInventoryOperationsCommandSource("invalid")).toMatchObject({ available: true });
  });
});
