import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  return { commandSource, readSource };
}

describe("Quest Acceptance override UI", () => {
  beforeEach(() => {
    let sequence = 0;
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => `00000000-0000-4000-8000-${String(++sequence).padStart(12, "0")}`) });
    vi.stubGlobal("matchMedia", vi.fn());
    Object.defineProperty(window, "matchMedia", { configurable: true, value: undefined });
  });

  it("does not optimistically update, then shows a copyable reconciled receipt and Audit navigation", async () => {
    const { commandSource, readSource } = sources();
    let resolveCommand!: (value: AdminQuestAcceptance) => void;
    commandSource.adjustProgress.mockReturnValue(new Promise((resolve) => { resolveCommand = resolve; }));
    readSource.getAcceptance = vi.fn().mockResolvedValue({ ...acceptance, progressValue: 2 });
    const onCanonicalAcceptance = vi.fn();
    const onOpenAudit = vi.fn();
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} commandSource={commandSource} onCanonicalAcceptance={onCanonicalAcceptance} onOpenAudit={onOpenAudit} />);

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
    const { commandSource, readSource } = sources();
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
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    await waitFor(() => expect(window.matchMedia).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified target evidence" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));

    expect(screen.getByText("Level 3 review")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Level 3 confirmation is unavailable on mobile");
    expect(screen.getByRole("button", { name: "Confirm Level 3 operation" })).toBeDisabled();
    expect(commandSource.adjustProgress).not.toHaveBeenCalled();
  });

  it("requires target re-verification and a second Level 3 confirmation", () => {
    const { commandSource, readSource } = sources();
    render(<QuestAcceptanceOverride acceptance={acceptance} access="ready" readSource={readSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Progress delta"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Reason *"), { target: { value: "Verified target evidence" } });
    fireEvent.click(screen.getByRole("button", { name: "Review operation" }));

    const confirm = screen.getByRole("button", { name: "Confirm Level 3 operation" });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Re-enter Acceptance ID"), { target: { value: "9001" } });
    expect(confirm).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(confirm).toBeEnabled();
    expect(confirm).not.toHaveFocus();
  });

  it("derives controls from the current canonical status", () => {
    const { commandSource, readSource } = sources();
    const { rerender } = render(<QuestAcceptanceOverride acceptance={{ ...acceptance, status: "GOAL_REACHED" }} access="ready" readSource={readSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);

    expect(screen.queryByLabelText("Progress delta")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "COMPLETED" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "CANCELED" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "IN_PROGRESS" })).not.toBeInTheDocument();

    rerender(<QuestAcceptanceOverride acceptance={{ ...acceptance, status: "COMPLETED" }} access="ready" readSource={readSource} commandSource={commandSource} onCanonicalAcceptance={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "No available operation" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review operation" })).not.toBeInTheDocument();
  });
});
