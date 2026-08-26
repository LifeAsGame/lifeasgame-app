import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
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
