import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import type { AdminInventoryOperationsDataSource, AdminItemDetail } from "../api/inventory.source";
import type { AdminPlayerInfo } from "./model";
import { PlayerInventoryMailbox } from "./PlayerInventoryMailbox";

const player: AdminPlayerInfo = {
  playerId: 10218, name: "HANEUL", gender: "FEMALE", job: "KNIGHT", level: 17, totalExp: 48200,
  currentHealth: 840, healthCapacity: 1000, currentMana: 310, manaCapacity: 420,
  str: 32, agi: 28, dex: 30, intel: 19, vit: 34, luc: 14, effects: [], representativeTitleId: 41,
};
const item: AdminItemDetail = { id: 1201, code: "HEALTH_POTION", name: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, maxDurability: null, baseAttrs: {} };
const inventory = { playerId: 10218, entries: [{ itemInstanceId: 71001, slotIndex: 0, itemId: 1201, itemName: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, quantity: 12, bound: false, durability: null }] };
const mailbox = { playerId: 10218, entries: [] };

function props(mode: "api" | "mock" = "api") {
  const readSource: AdminInventoryOperationsDataSource = {
    descriptor: mode === "api"
      ? { mode, badge: "API", label: "/admin/v1", inventoryLabel: "/admin/v1/items" }
      : { mode, badge: "MOCK DATA", label: "Local Admin Mock", inventoryLabel: "Local Admin Mock" },
    searchItems: vi.fn().mockResolvedValue({ content: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
    getItem: vi.fn().mockResolvedValue(item),
    getInventory: vi.fn().mockResolvedValue(inventory),
    getMailbox: vi.fn().mockResolvedValue(mailbox),
  };
  const commandSource: AdminInventoryOperationsCommandSource = mode === "api"
    ? { available: true, addInventory: vi.fn().mockResolvedValue({ slots: [0] }), deliverMailbox: vi.fn().mockResolvedValue({ slot: 0 }) }
    : { available: false };
  const auditSource: AdminAuditDataSource = {
    descriptor: mode === "api"
      ? { mode, badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" }
      : { mode, badge: "MOCK DATA", label: "Local Admin Mock", eventLabel: "Local Admin Mock" },
    getEvents: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  };
  return { player, access: "ready" as const, readSource, commandSource, auditSource, onOpenAudit: vi.fn() };
}

function desktop() {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
}

async function prepareInventoryReview() {
  await screen.findByText("71001");
  fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
  fireEvent.click(await screen.findByRole("button", { name: /Health Potion/ }));
  await screen.findByLabelText("Selected Item detail");
  fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified support case" } });
  fireEvent.click(screen.getByRole("button", { name: "Review Level 2 operation" }));
  await screen.findByRole("dialog", { name: "Confirm entitlement operation" });
}

describe("Player Inventory and Mailbox full-detail surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    desktop();
    let sequence = 0;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) });
  });

  it("loads exact destination tabs and keeps backend fields bounded", async () => {
    const input = props();
    render(<PlayerInventoryMailbox {...input} />);
    expect(await screen.findByText("Health Potion")).toBeInTheDocument();
    expect(input.readSource.getInventory).toHaveBeenCalledWith(10218);
    expect(screen.getByText("71001")).toBeInTheDocument();
    const destinationNav = screen.getByRole("navigation", { name: "Entitlement destination" });
    expect(screen.getByRole("button", { name: "Inventory" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Mailbox" })).not.toHaveAttribute("role", "tab");
    expect(destinationNav).not.toContainElement(screen.getByRole("button", { name: "Refresh" }));
    fireEvent.click(screen.getByRole("button", { name: "Mailbox" }));
    expect(await screen.findByRole("heading", { name: "Mailbox is empty" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mailbox" })).toHaveAttribute("aria-current", "page");
    expect(input.readSource.getMailbox).toHaveBeenCalledWith(10218);
    expect(screen.queryByText(/capacity|free slot|instance attrs/i)).not.toBeInTheDocument();
  });

  it("uses server Item search, exact detail, Level 2 review, canonical reload, and normal Audit navigation", async () => {
    const input = props();
    render(<PlayerInventoryMailbox {...input} />);
    await screen.findByText("71001");

    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Health" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "CONSUMABLE" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "POTION" } });
    fireEvent.change(screen.getByLabelText("Rarity"), { target: { value: "COMMON" } });
    fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
    expect(await screen.findByRole("button", { name: /Health Potion/ })).toBeInTheDocument();
    expect(input.readSource.searchItems).toHaveBeenCalledWith({ name: "Health", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", page: 0, size: 20 });

    fireEvent.click(screen.getByRole("button", { name: /Health Potion/ }));
    expect(await screen.findByLabelText("Selected Item detail")).toHaveTextContent("1201 · HEALTH_POTION");
    expect(input.readSource.getItem).toHaveBeenCalledWith(1201);
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Bound entitlement"));
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified support case" } });
    fireEvent.click(screen.getByRole("button", { name: "Review Level 2 operation" }));

    const dialog = await screen.findByRole("dialog", { name: "Confirm entitlement operation" });
    expect(dialog).toHaveTextContent("HANEUL");
    expect(dialog).toHaveTextContent("INVENTORY · quantity 2 · Bound");
    expect(dialog).toHaveTextContent("Verified support case");
    expect(dialog).toHaveTextContent("Server capacity, stacking, and placement rules are authoritative");
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 2 operation" }));

    expect(await screen.findByRole("heading", { name: "Entitlement confirmed" })).toBeInTheDocument();
    expect(screen.getByText("The command succeeded and the exact destination was reloaded.")).toBeInTheDocument();
    if (!input.commandSource.available) throw new Error("Expected API command source");
    expect(input.commandSource.addInventory).toHaveBeenCalledWith(10218, { itemId: 1201, quantity: 2, bound: true, reason: "Verified support case" }, expect.objectContaining({ idempotencyKey: expect.stringMatching(/^entitlement:/), correlationId: expect.stringMatching(/^admin-operation:/) }));
    expect(input.readSource.getInventory).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "Open Audit Explorer" }));
    expect(input.onOpenAudit).toHaveBeenCalledTimes(1);
  });

  it("fails closed when exact Item detail identity mismatches", async () => {
    const input = props();
    vi.mocked(input.readSource.getItem).mockResolvedValue({ ...item, id: 9999 });
    render(<PlayerInventoryMailbox {...input} />);
    await screen.findByText("71001");
    fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
    fireEvent.click(await screen.findByRole("button", { name: /Health Potion/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("requested Item ID");
    expect(screen.getByRole("button", { name: "Review Level 2 operation" })).toBeDisabled();
  });

  it("keeps Mock reads truthful while making mutation explicitly unavailable", async () => {
    const input = props("mock");
    render(<PlayerInventoryMailbox {...input} />);
    expect(await screen.findByText("71001")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Real API required" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|deliver/i })).not.toBeInTheDocument();
  });

  it("keeps bounded reads on mobile but removes entitlement mutation", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    const input = props();
    render(<PlayerInventoryMailbox {...input} />);
    expect(await screen.findByText("71001")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Mutation unavailable on mobile" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm/i })).not.toBeInTheDocument();
    expect(input.commandSource.available && input.commandSource.addInventory).not.toHaveBeenCalled();
  });

  it("does not expose a submit state from a mismatched destination response", async () => {
    const input = props();
    vi.mocked(input.readSource.getInventory).mockResolvedValue({ playerId: 99999, entries: [] });
    render(<PlayerInventoryMailbox {...input} />);
    expect(await screen.findByRole("heading", { name: "Unable to load Inventory" })).toBeInTheDocument();
    expect(screen.getByText("Inventory response did not match the requested Player ID.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Review Level 2 operation" })).toBeDisabled();
  });

  it.each([
    [401, "Authentication required", "INVENTORY"],
    [403, "Admin access denied", "MAILBOX"],
  ] as const)("fails closed when a destination read returns %s", async (status, heading, target) => {
    const input = props();
    if (target === "INVENTORY") vi.mocked(input.readSource.getInventory).mockRejectedValue(new ApiError(status, `HTTP_${status}`, "Destination denied"));
    else vi.mocked(input.readSource.getMailbox).mockRejectedValue(new ApiError(status, `HTTP_${status}`, "Destination denied"));
    render(<PlayerInventoryMailbox {...input} />);
    if (target === "MAILBOX") {
      await screen.findByText("71001");
      fireEvent.click(screen.getByRole("button", { name: "Mailbox" }));
    }

    expect(await screen.findByRole("heading", { name: heading })).toBeInTheDocument();
    expect(screen.queryByText("71001")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /refresh|review|confirm|retry/i })).not.toBeInTheDocument();
  });

  it("clears cached destination and verified Item when Item search returns 401", async () => {
    const input = props();
    render(<PlayerInventoryMailbox {...input} />);
    await screen.findByText("71001");
    fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
    fireEvent.click(await screen.findByRole("button", { name: /Health Potion/ }));
    expect(await screen.findByLabelText("Selected Item detail")).toBeInTheDocument();
    vi.mocked(input.readSource.searchItems).mockRejectedValueOnce(new ApiError(401, "UNAUTHORIZED", "Session expired"));

    fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
    expect(await screen.findByRole("heading", { name: "Authentication required" })).toBeInTheDocument();
    expect(screen.queryByText("71001")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Selected Item detail")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|retry/i })).not.toBeInTheDocument();
  });

  it("fails closed when exact Item detail returns 403", async () => {
    const input = props();
    vi.mocked(input.readSource.getItem).mockRejectedValue(new ApiError(403, "FORBIDDEN", "Item access denied"));
    render(<PlayerInventoryMailbox {...input} />);
    await screen.findByText("71001");
    fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
    fireEvent.click(await screen.findByRole("button", { name: /Health Potion/ }));

    expect(await screen.findByRole("heading", { name: "Admin access denied" })).toBeInTheDocument();
    expect(screen.queryByText("71001")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Selected Item detail")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|retry/i })).not.toBeInTheDocument();
  });

  it("removes the active review and cached data when the command returns 401", async () => {
    const input = props();
    if (!input.commandSource.available) throw new Error("Expected API command source");
    vi.mocked(input.commandSource.addInventory).mockRejectedValue(new ApiError(401, "UNAUTHORIZED", "Session expired"));
    render(<PlayerInventoryMailbox {...input} />);
    await prepareInventoryReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 2 operation" }));

    expect(await screen.findByRole("heading", { name: "Authentication required" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("71001")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Selected Item detail")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|retry|reconcile/i })).not.toBeInTheDocument();
    expect(input.commandSource.addInventory).toHaveBeenCalledTimes(1);
  });

  it("fails closed when Audit reconciliation returns 403 without retrying", async () => {
    const input = props();
    if (!input.commandSource.available) throw new Error("Expected API command source");
    vi.mocked(input.commandSource.addInventory).mockRejectedValue(new Error("Connection lost"));
    vi.mocked(input.auditSource.getEvents).mockRejectedValue(new ApiError(403, "FORBIDDEN", "Audit access denied"));
    render(<PlayerInventoryMailbox {...input} />);
    await prepareInventoryReview();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 2 operation" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reconcile operation" }));

    expect(await screen.findByRole("heading", { name: "Admin access denied" })).toBeInTheDocument();
    expect(screen.queryByText("71001")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|retry|reconcile/i })).not.toBeInTheDocument();
    expect(input.commandSource.addInventory).toHaveBeenCalledTimes(1);
    expect(input.auditSource.getEvents).toHaveBeenCalledTimes(1);
  });

  it("shows POST 2xx as DIRECT stale success without reconcile or retry when reload fails", async () => {
    const input = props();
    if (!input.commandSource.available) throw new Error("Expected API command source");
    vi.mocked(input.readSource.getInventory).mockReset().mockResolvedValueOnce(inventory).mockRejectedValueOnce(new Error("Reload unavailable"));
    const onOperationLockChange = vi.fn();
    render(<PlayerInventoryMailbox {...input} onOperationLockChange={onOperationLockChange} />);
    await prepareInventoryReview();
    expect(onOperationLockChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("button", { name: "Inventory" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Mailbox" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 2 operation" }));

    expect(await screen.findByRole("heading", { name: "Entitlement confirmed" })).toBeInTheDocument();
    expect(screen.getByText("The command succeeded, but the canonical destination could not be refreshed.")).toBeInTheDocument();
    expect(screen.queryByText(/exact destination was reloaded/i)).not.toBeInTheDocument();
    expect(screen.getByText(/visible list as stale/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reconcile|retry same/i })).not.toBeInTheDocument();
    expect(onOperationLockChange).toHaveBeenLastCalledWith(false);
    expect(input.commandSource.addInventory).toHaveBeenCalledTimes(1);
    expect(input.auditSource.getEvents).not.toHaveBeenCalled();
  });
});
