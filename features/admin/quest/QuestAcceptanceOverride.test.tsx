import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminAuditDataSource } from "../api/audit.source";
import type { AdminQuestCommandSource } from "../api/quest.command";
import type { AdminQuestDataSource } from "../api/quest.source";
import type { AdminQuestAcceptance } from "./model";
import { QuestAcceptanceOverride } from "./QuestAcceptanceOverride";

const acceptance: AdminQuestAcceptance = {
  id: 9001, questId: 501, playerId: 10218, code: "quest:record:first-trace", title: "First Trace", category: null,
  targetType: "COUNT", targetValue: 3, progressValue: 1, status: "IN_PROGRESS", completionPolicy: "MANUAL", repeatRule: "ONCE",
  periodStart: null, periodEnd: null, acceptedAt: "2026-08-24T04:00:00Z", periodKey: null, goalReachedAt: null,
  completedAt: null, dueAt: null, semanticCategory: "RECORD", progressSource: "RECORD_CREATED", repeatPolicy: "ONCE", roleTemplateCode: null,
};

function sources() {
  const commandSource = { available: true, adjustProgress: vi.fn(), changeStatus: vi.fn() } satisfies AdminQuestCommandSource;
  const readSource = {
    descriptor: { mode: "api", badge: "API", label: "/admin/v1", questLabel: "/admin/v1/quests" },
    getAcceptance: vi.fn(),
  } as unknown as AdminQuestDataSource;
  const auditSource = {
    descriptor: { mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" },
    getEvents: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
  } satisfies AdminAuditDataSource;
  return { commandSource, readSource, auditSource };
}

describe("Quest Acceptance override UI", () => {
  beforeEach(() => {
    let sequence = 0;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) });
    vi.stubGlobal("matchMedia", vi.fn());
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined });
  });

  it("does not optimistically update, then shows a copyable reconciled receipt and Audit navigation", async () => {
    const { commandSource, readSource, auditSource } = sources();
    let resolveCommand!: (value: AdminQuestAcceptance) => void;
    commandSource.adjustProgress.mockReturnValue(new Promise((resolve) => { resolveCommand = resolve; }));
    readSource.getAcceptance = vi.fn().mockResolvedValue({ ...acceptance, progressValue: 2 });
    const onCanonicalAcceptance = vi.fn();
    const onOpenAudit = vi.fn();
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={onCanonicalAcceptance} onOpenAudit={onOpenAudit} />);

    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified support case" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    expect(screen.getByRole("heading", { name: "Confirm Acceptance operation" })).toHaveFocus();
    expect(screen.getByText("Level 2 review")).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: "Confirm Level 2 operation" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(commandSource.adjustProgress).toHaveBeenCalledTimes(1);
    expect(onCanonicalAcceptance).not.toHaveBeenCalled();
    resolveCommand(acceptance);

    expect(await screen.findByRole("heading", { name: "Operation completed" })).toBeInTheDocument();
    expect(onCanonicalAcceptance).toHaveBeenCalledWith({ ...acceptance, progressValue: 2 });
    expect(screen.getByText(/quest-operation:/).tagName).toBe("CODE");
    fireEvent.click(screen.getByRole("button", { name: "Open Audit Explorer" }));
    expect(onOpenAudit).toHaveBeenCalledTimes(1);
  });

  it("blocks Level 3 confirmation on mobile", async () => {
    const { commandSource, readSource, auditSource } = sources();
    const listeners = new Set<() => void>();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: vi.fn(() => ({
        matches: true,
        media: "(max-width: 759px)",
        onchange: null,
        addEventListener: (_name: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_name: string, listener: () => void) => listeners.delete(listener),
        addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      })),
    });
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    await waitFor(() => expect(window.matchMedia).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified target evidence" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));

    expect(screen.getByRole("heading", { name: "Level 3 unavailable on mobile" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm Level 3 operation" })).not.toBeInTheDocument();
    expect(commandSource.adjustProgress).not.toHaveBeenCalled();
  });

  it("uses a dedicated desktop L3 surface with the approved safety hierarchy", () => {
    const { commandSource, readSource, auditSource } = sources();
    render(<aside data-testid="quick-detail"><QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} /></aside>);
    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified target evidence" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));

    const dialog = screen.getByRole("dialog");
    expect(screen.getByTestId("quick-detail")).not.toContainElement(dialog);
    expect(screen.getByRole("heading", { name: "Review target and consequences before confirmation" })).toHaveFocus();
    expect(screen.getByRole("heading", { name: "Target identity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Dependency / blast-radius review" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Mandatory reason" })).toBeInTheDocument();
    expect(screen.getByText(/additive, non-negative progress only/i)).toBeInTheDocument();
    expect(screen.getByText(/409 or unknown results require reconciliation/i)).toBeInTheDocument();
    expect(screen.getByText(/Durable Admin Audit evidence must match/i)).toBeInTheDocument();
    expect(screen.getByText("Verified target evidence")).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "Confirm Level 3 operation" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Re-enter Acceptance ID"), { target: { value: "9001" } });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    expect(confirm).not.toHaveFocus();
  });

  it("resets L3 confirmation after cancel for the same and a different intent", () => {
    const { commandSource, readSource, auditSource } = sources();
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "First review" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    fireEvent.change(screen.getByLabelText("Re-enter Acceptance ID"), { target: { value: "9001" } });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(screen.getByRole("button", { name: "Confirm Level 3 operation" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    expect(screen.getByLabelText("Re-enter Acceptance ID")).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm Level 3 operation" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.change(screen.getByLabelText("Operation"), { target: { value: "status" } });
    fireEvent.change(screen.getByLabelText("Target status"), { target: { value: "CANCELED" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Different review" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    expect(screen.getByLabelText("Re-enter Acceptance ID")).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm Level 3 operation" })).toBeDisabled();
  });

  it("resets L3 confirmation when a rejected submit returns to REVIEWING", async () => {
    const { commandSource, readSource, auditSource } = sources();
    commandSource.adjustProgress.mockRejectedValue(new ApiError(422, "INVALID_COMMAND", "Server rejected the operation"));
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Rejected review" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    fireEvent.change(screen.getByLabelText("Re-enter Acceptance ID"), { target: { value: "9001" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 3 operation" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Server rejected the operation");
    expect(screen.getByLabelText("Re-enter Acceptance ID")).toHaveValue("");
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Confirm Level 3 operation" })).toBeDisabled();
  });

  it("uses a full-page L3 surface at tablet width", () => {
    const css = readFileSync("features/admin/admin.module.css", "utf8");
    expect(css).toMatch(/@media \(max-width: 1179px\)[\s\S]*?\.questLevel3Dialog\s*\{[^}]*width:\s*calc\(100vw - 32px\)[^}]*height:\s*calc\(100svh - 32px\)/);
  });

  it("shows ambiguous operation identity without exposing Retry", async () => {
    const { commandSource, readSource, auditSource } = sources();
    commandSource.adjustProgress.mockRejectedValue(new Error("Connection lost"));
    readSource.getAcceptance = vi.fn().mockResolvedValue({ ...acceptance, progressValue: 2 });
    const onOpenAudit = vi.fn();
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} onOpenAudit={onOpenAudit} />);
    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Ambiguous result" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 2 operation" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reconcile current state" }));

    expect(await screen.findByRole("heading", { name: "Current state matches, but this operation is not proven" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.getByText(/quest-operation:/).tagName).toBe("CODE");
    fireEvent.click(screen.getByRole("button", { name: "Open Audit Explorer" }));
    expect(onOpenAudit).toHaveBeenCalledTimes(1);
  });

  it("labels retryable reconciliation and manually retries with the same key", async () => {
    const { commandSource, readSource, auditSource } = sources();
    commandSource.adjustProgress.mockRejectedValue(new Error("Connection lost"));
    readSource.getAcceptance = vi.fn().mockResolvedValue(acceptance);
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Retryable result" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Level 2 operation" }));
    fireEvent.click(await screen.findByRole("button", { name: "Reconcile current state" }));

    expect(await screen.findByRole("heading", { name: "Operation was not reflected" })).toBeInTheDocument();
    const firstMetadata = commandSource.adjustProgress.mock.calls[0][2];
    fireEvent.click(screen.getByRole("button", { name: "Retry same operation" }));
    await waitFor(() => expect(commandSource.adjustProgress).toHaveBeenCalledTimes(2));
    expect(commandSource.adjustProgress.mock.calls[1][2]).toEqual(firstMetadata);
  });

  it("derives controls from the current canonical status", () => {
    const { commandSource, readSource, auditSource } = sources();
    const { rerender } = render(<QuestAcceptanceOverride acceptance={{ ...acceptance, status: "GOAL_REACHED" }} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);

    expect(screen.queryByLabelText("Progress delta")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "COMPLETED" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CANCELED" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "IN_PROGRESS" })).not.toBeInTheDocument();

    rerender(<QuestAcceptanceOverride acceptance={{ ...acceptance, status: "COMPLETED" }} access="ready" readSource={readSource} auditSource={auditSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "No available operation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review operation" })).not.toBeInTheDocument();
  });
});
