import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditEvent, AdminAuditPage } from "../model";
import { AuditExplorer } from "./AuditExplorer";

const api = vi.hoisted(() => ({ getAdminAuditEvents: vi.fn() }));
vi.mock("../api/audit", () => api);

const event: AdminAuditEvent = {
  id: 184,
  actorUserId: 42,
  action: "PLAYER_STATUS_REVIEW",
  targetType: "PLAYER",
  targetId: "PLR-008314",
  reason: "Support case review",
  result: "SUCCESS",
  correlationId: "COR-20260825-881",
  idempotencyKey: "IDEMP-1A2B",
  occurredAt: "2026-08-25T04:47:06Z",
};

const page = (items: AdminAuditEvent[], nextCursor: string | null = null): AdminAuditPage => ({ items, nextCursor });

describe("Admin Audit Explorer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders initial loading and canonical empty states", async () => {
    api.getAdminAuditEvents.mockReturnValueOnce(new Promise(() => {}));
    const loading = render(<AuditExplorer access="ready" onLogin={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "Loading Admin Audit" })).toBeInTheDocument();
    loading.unmount();

    api.getAdminAuditEvents.mockResolvedValueOnce(page([]));
    render(<AuditExplorer access="ready" onLogin={vi.fn()} />);
    expect(await screen.findByRole("heading", { name: "No audit events" })).toBeInTheDocument();
  });

  it("renders only safe event fields and exposes no high-risk command", async () => {
    api.getAdminAuditEvents.mockResolvedValueOnce(page([{ ...event, requestBody: "PRIVATE_BODY" } as AdminAuditEvent]));
    render(<AuditExplorer access="ready" onLogin={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "AUD-184" }));
    expect(screen.getByRole("heading", { name: "Audit detail" })).toHaveFocus();
    expect(screen.getByText("Support case review")).toBeInTheDocument();
    expect(screen.getByText("COR-20260825-881")).toBeInTheDocument();
    expect(screen.queryByText("PRIVATE_BODY")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adjust|grant|revoke|deliver|delete|override|mutate/i })).not.toBeInTheDocument();
  });

  it("uses backend nextCursor for Older and local cursor history for Newer", async () => {
    api.getAdminAuditEvents
      .mockResolvedValueOnce(page([event], "opaque+/=older"))
      .mockResolvedValueOnce(page([{ ...event, id: 183 }]))
      .mockResolvedValueOnce(page([event], "opaque+/=older"));
    render(<AuditExplorer access="ready" onLogin={vi.fn()} />);

    fireEvent.click(await screen.findByRole("button", { name: "Older" }));
    expect(await screen.findByRole("button", { name: "AUD-183" })).toBeInTheDocument();
    expect(api.getAdminAuditEvents).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: "opaque+/=older", size: 50 }));

    fireEvent.click(screen.getByRole("button", { name: "Newer" }));
    expect(await screen.findByRole("button", { name: "AUD-184" })).toBeInTheDocument();
    expect(api.getAdminAuditEvents).toHaveBeenNthCalledWith(3, { size: 50 });
  });

  it("applies filters only on submit and supports explicit retry", async () => {
    api.getAdminAuditEvents.mockResolvedValue(page([]));
    render(<AuditExplorer access="ready" onLogin={vi.fn()} />);
    await screen.findByRole("heading", { name: "No audit events" });

    fireEvent.change(screen.getByLabelText("Action"), { target: { value: "player_lookup" } });
    expect(api.getAdminAuditEvents).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Apply filters" }));
    await waitFor(() => expect(api.getAdminAuditEvents).toHaveBeenCalledTimes(2));
    expect(api.getAdminAuditEvents).toHaveBeenLastCalledWith(expect.objectContaining({ action: "PLAYER_LOOKUP" }));

    api.getAdminAuditEvents.mockRejectedValueOnce(new Error("Network unavailable")).mockResolvedValueOnce(page([]));
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(await screen.findByRole("heading", { name: "Unable to load Admin Audit" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("heading", { name: "No matching audit events" })).toBeInTheDocument();
  });

  it.each([
    [401, "Authentication required"],
    [403, "Admin access denied"],
  ])("renders %s without cached audit content", async (status, title) => {
    api.getAdminAuditEvents.mockRejectedValueOnce(new ApiError(status, `HTTP_${status}`, "Denied"));
    render(<AuditExplorer access="ready" onLogin={vi.fn()} />);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByText("PLAYER_STATUS_REVIEW")).not.toBeInTheDocument();
  });
});
