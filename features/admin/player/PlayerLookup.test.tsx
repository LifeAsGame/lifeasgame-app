import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminInventoryOperationsCommandSource } from "../api/inventory.command";
import type { AdminInventoryOperationsDataSource } from "../api/inventory.source";
import type { AdminPlayerDataSource } from "../api/player.source";
import type { AdminPlayerInfo, AdminPlayerSummary } from "./model";
import { PlayerLookup } from "./PlayerLookup";

const summary: AdminPlayerSummary = { playerId: 10218, userId: 8314, name: "HANEUL" };
const detail: AdminPlayerInfo = {
  playerId: 10218, name: "HANEUL", gender: "FEMALE", job: "KNIGHT", level: 17, totalExp: 48200,
  currentHealth: 840, healthCapacity: 1000, currentMana: 310, manaCapacity: 420,
  str: 32, agi: 28, dex: 30, intel: 19, vit: 34, luc: 14,
  effects: [{ code: "FOCUSED", category: "BUFF" }], representativeTitleId: 41,
};

const source = (): AdminPlayerDataSource => ({
  descriptor: { mode: "api", badge: "API", label: "/admin/v1", playerLabel: "/admin/v1/players" },
  lookupByUserId: vi.fn(),
  getByPlayerId: vi.fn(),
});

function submitUserId(value = "8314") {
  fireEvent.change(screen.getByLabelText("User ID"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Lookup Player" }));
}

describe("read-only Player Lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  });

  it("starts without an unbounded request and exposes only exact User ID lookup", () => {
    const dataSource = source();
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    expect(screen.getByRole("heading", { name: "Ready for exact lookup" })).toBeInTheDocument();
    expect(dataSource.lookupByUserId).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/email|nickname|search text/i)).not.toBeInTheDocument();
    expect(screen.getByText("Exact lookup key: User ID · no list or text search")).toBeInTheDocument();
  });

  it("shows loading, Summary, then fetches full detail only on explicit open", async () => {
    const dataSource = source();
    let resolveLookup!: (value: AdminPlayerSummary) => void;
    vi.mocked(dataSource.lookupByUserId).mockReturnValue(new Promise((resolve) => { resolveLookup = resolve; }));
    vi.mocked(dataSource.getByPlayerId).mockResolvedValue(detail);
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    expect(await screen.findByRole("heading", { name: "Loading Player" })).toBeInTheDocument();
    resolveLookup(summary);
    expect(await screen.findByRole("button", { name: "Open read-only detail" })).toBeInTheDocument();
    expect(dataSource.getByPlayerId).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Open read-only detail" }));
    expect(await screen.findByRole("heading", { name: "HANEUL" })).toHaveFocus();
    expect(dataSource.getByPlayerId).toHaveBeenCalledWith(10218);
    expect(screen.getByText("48200")).toBeInTheDocument();
    expect(screen.getByText("FOCUSED")).toBeInTheDocument();
    expect(screen.queryByText(/wallet|inventory|mailbox|life score|exp progress/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /grant|revoke|rename|adjust|deliver|override|set hp|set mp/i })).not.toBeInTheDocument();
  });

  it("keeps quick detail mutation-free and enters full Player detail explicitly", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockResolvedValue(summary);
    vi.mocked(dataSource.getByPlayerId).mockResolvedValue(detail);
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only detail" }));
    const openFull = await screen.findByRole("button", { name: "Open full Player detail" });
    expect(screen.queryByRole("button", { name: /add to inventory|deliver to mailbox|review level/i })).not.toBeInTheDocument();

    fireEvent.click(openFull);
    expect(screen.getByRole("heading", { name: "HANEUL", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("10218")).toBeInTheDocument();
    expect(screen.getByText("8314")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Inventory / Mailbox" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "← Back to Player Lookup" }));
    expect(screen.getByRole("heading", { name: "Player Lookup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "HANEUL" })).toBeInTheDocument();
  });

  it.each([
    ["loading", "Validating session"],
    ["unauthenticated", "Authentication required"],
  ] as const)("exits full Player detail immediately when access becomes %s", async (nextAccess, safeHeading) => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockResolvedValue(summary);
    vi.mocked(dataSource.getByPlayerId).mockResolvedValue(detail);
    const onLogin = vi.fn();
    const view = render(<PlayerLookup access="ready" onLogin={onLogin} dataSource={dataSource} />);

    submitUserId();
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only detail" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open full Player detail" }));
    expect(screen.getByRole("heading", { name: "HANEUL", level: 1 })).toBeInTheDocument();

    view.rerender(<PlayerLookup access={nextAccess} onLogin={onLogin} dataSource={dataSource} />);
    expect(screen.getByRole("heading", { name: safeHeading })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "HANEUL" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inventory / Mailbox" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|retry same/i })).not.toBeInTheDocument();

    view.rerender(<PlayerLookup access="ready" onLogin={onLogin} dataSource={dataSource} />);
    expect(screen.getByRole("heading", { name: "Ready for exact lookup" })).toBeInTheDocument();
    expect(dataSource.lookupByUserId).toHaveBeenCalledTimes(1);
    expect(dataSource.getByPlayerId).toHaveBeenCalledTimes(1);
  });

  it("latches a direct child 403 as a full-detail fail-closed state", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockResolvedValue(summary);
    vi.mocked(dataSource.getByPlayerId).mockResolvedValue(detail);
    const inventorySource: AdminInventoryOperationsDataSource = {
      descriptor: { mode: "api", badge: "API", label: "/admin/v1", inventoryLabel: "/admin/v1/items" },
      searchItems: vi.fn(),
      getItem: vi.fn(),
      getInventory: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN", "Inventory access denied")),
      getMailbox: vi.fn(),
    };
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} inventorySource={inventorySource} />);

    submitUserId();
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only detail" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open full Player detail" }));
    fireEvent.click(screen.getByRole("button", { name: "Inventory / Mailbox" }));

    expect(await screen.findByRole("heading", { name: "Admin access denied" })).toBeInTheDocument();
    expect(screen.getByText("Inventory access denied")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "HANEUL" })).not.toBeInTheDocument();
    expect(screen.queryByText("10218")).not.toBeInTheDocument();
    expect(screen.queryByText("8314")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Inventory / Mailbox" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review|confirm|retry/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "← Back to Player Lookup" })).toBeEnabled();
  });

  it("keeps PlayerFullDetail mounted while an operation is unresolved and unlocks after IDLE or success", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockResolvedValue(summary);
    vi.mocked(dataSource.getByPlayerId).mockResolvedValue(detail);
    const verifiedItem = { id: 1201, code: "HEALTH_POTION", name: "Health Potion", category: "CONSUMABLE", type: "POTION", rarity: "COMMON", stackable: true, maxStack: 99, maxDurability: null, baseAttrs: {} };
    const inventorySource: AdminInventoryOperationsDataSource = {
      descriptor: { mode: "api", badge: "API", label: "/admin/v1", inventoryLabel: "/admin/v1/items" },
      searchItems: vi.fn().mockResolvedValue({ content: [verifiedItem], page: 0, size: 20, totalElements: 1, totalPages: 1 }),
      getItem: vi.fn().mockResolvedValue(verifiedItem),
      getInventory: vi.fn().mockResolvedValue({ playerId: 10218, entries: [] }),
      getMailbox: vi.fn().mockResolvedValue({ playerId: 10218, entries: [] }),
    };
    const commandSource: AdminInventoryOperationsCommandSource = { available: true, addInventory: vi.fn().mockResolvedValue({ slots: [0] }), deliverMailbox: vi.fn() };
    const auditSource: AdminAuditDataSource = {
      descriptor: { mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" },
      getEvents: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    };
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} inventorySource={inventorySource} commandSource={commandSource} auditSource={auditSource} />);

    submitUserId();
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only detail" }));
    fireEvent.click(await screen.findByRole("button", { name: "Open full Player detail" }));
    const back = screen.getByRole("button", { name: "← Back to Player Lookup" });
    const overview = screen.getByRole("button", { name: "Overview" });
    expect(back).toBeEnabled();
    expect(overview).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Inventory / Mailbox" }));
    await screen.findByRole("heading", { name: "Inventory is empty" });
    fireEvent.click(screen.getByRole("button", { name: "Search Items" }));
    fireEvent.click(await screen.findByRole("button", { name: /Health Potion/ }));
    await screen.findByLabelText("Selected Item detail");
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified support case" } });
    fireEvent.click(screen.getByRole("button", { name: "Review Level 2 operation" }));

    expect(await screen.findByRole("dialog", { name: "Confirm entitlement operation" })).toBeInTheDocument();
    expect(back).toBeDisabled();
    expect(overview).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => { expect(back).toBeEnabled(); expect(overview).toBeEnabled(); });

    fireEvent.click(screen.getByRole("button", { name: "Review Level 2 operation" }));
    fireEvent.click(await screen.findByRole("button", { name: "Confirm Level 2 operation" }));
    expect(await screen.findByRole("heading", { name: "Entitlement confirmed" })).toBeInTheDocument();
    await waitFor(() => { expect(back).toBeEnabled(); expect(overview).toBeEnabled(); });
    fireEvent.click(overview);
    expect(screen.getByRole("heading", { name: "Player state" })).toBeInTheDocument();
  });

  it("renders not-found and generic retry without switching sources", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId)
      .mockRejectedValueOnce(new ApiError(404, "PLAYER_NOT_FOUND", "Player was not found."))
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce(summary);
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    expect(await screen.findByRole("heading", { name: "Player not found" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "Unable to load Player" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Open read-only detail" })).toBeInTheDocument();
    expect(dataSource.lookupByUserId).toHaveBeenCalledTimes(3);
  });

  it("rejects a mismatched lookup identity and retries the same userId", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId)
      .mockResolvedValueOnce({ ...summary, userId: 9999, name: "WRONG PLAYER" })
      .mockResolvedValueOnce(summary);
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    expect(await screen.findByRole("heading", { name: "Unable to load Player" })).toBeInTheDocument();
    expect(screen.getByText("Player lookup response did not match the requested User ID.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Lookup result" })).not.toBeInTheDocument();
    expect(screen.queryByText("WRONG PLAYER")).not.toBeInTheDocument();
    expect(screen.queryByText("9999")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "Open read-only detail" })).toBeInTheDocument();
    expect(dataSource.lookupByUserId).toHaveBeenNthCalledWith(1, 8314);
    expect(dataSource.lookupByUserId).toHaveBeenNthCalledWith(2, 8314);
  });

  it("keeps Summary and retries the same playerId when detail is not found", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockResolvedValue(summary);
    vi.mocked(dataSource.getByPlayerId)
      .mockRejectedValueOnce(new ApiError(404, "PLAYER_NOT_FOUND", "Player was not found."))
      .mockResolvedValueOnce(detail);
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only detail" }));

    expect(await screen.findByRole("heading", { name: "Player detail unavailable" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lookup result" })).toBeInTheDocument();
    expect(screen.getByText("The Player detail could not be found for the returned Player ID.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Player not found" })).not.toBeInTheDocument();
    expect(screen.queryByText("No Player is linked to that User ID.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "HANEUL" })).toHaveFocus();
    expect(dataSource.getByPlayerId).toHaveBeenNthCalledWith(1, 10218);
    expect(dataSource.getByPlayerId).toHaveBeenNthCalledWith(2, 10218);
    expect(dataSource.lookupByUserId).toHaveBeenCalledTimes(1);
  });

  it("keeps Summary when detail identity mismatches and retries the same playerId", async () => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockResolvedValue(summary);
    vi.mocked(dataSource.getByPlayerId)
      .mockResolvedValueOnce({ ...detail, playerId: 55555, name: "WRONG DETAIL" })
      .mockResolvedValueOnce(detail);
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    fireEvent.click(await screen.findByRole("button", { name: "Open read-only detail" }));

    expect(await screen.findByRole("heading", { name: "Unable to load Player detail" })).toBeInTheDocument();
    expect(screen.getByText("Player detail response did not match the requested Player ID.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Lookup result" })).toBeInTheDocument();
    expect(screen.getByText("HANEUL")).toBeInTheDocument();
    expect(screen.queryByText("WRONG DETAIL")).not.toBeInTheDocument();
    expect(screen.queryByText("55555")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "HANEUL" })).toHaveFocus();
    expect(dataSource.getByPlayerId).toHaveBeenNthCalledWith(1, 10218);
    expect(dataSource.getByPlayerId).toHaveBeenNthCalledWith(2, 10218);
  });

  it.each([
    [401, "Authentication required"],
    [403, "Admin access denied"],
  ])("renders %s without cached Player data", async (status, title) => {
    const dataSource = source();
    vi.mocked(dataSource.lookupByUserId).mockRejectedValueOnce(new ApiError(status, `HTTP_${status}`, "Denied"));
    render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={dataSource} />);

    submitUserId();
    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByText("HANEUL")).not.toBeInTheDocument();
  });

  it("keeps API and Mock screen anatomy identical while labeling the selected source", async () => {
    const apiSource = source();
    vi.mocked(apiSource.lookupByUserId).mockResolvedValue(summary);
    const mockSource: AdminPlayerDataSource = { ...apiSource, descriptor: { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", playerLabel: "Local Admin Mock" } };
    const view = render(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={apiSource} />);
    expect(screen.getByRole("heading", { name: "Player Lookup" })).toBeInTheDocument();
    expect(screen.getByText("/admin/v1/players")).toBeInTheDocument();

    view.rerender(<PlayerLookup access="ready" onLogin={vi.fn()} dataSource={mockSource} />);
    await waitFor(() => expect(screen.getByText("Local Admin Mock")).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: "Player Lookup" })).toBeInTheDocument();
  });
});
