import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { AdminQuestDataSource } from "../api/quest.source";
import type { AdminQuestCommandSource } from "../api/quest.command";
import type { AdminQuestAcceptance, AdminQuestBlueprint, AdminQuestDefinition } from "./model";
import { QuestRuntimeStatus } from "./QuestRuntimeStatus";

const blueprint: AdminQuestBlueprint = {
  code: "quest:record:first-trace", title: "First Trace", category: null, descriptionMd: "Record one LifeLog entry.",
  targetType: "COUNT", targetValue: 1, repeatRule: "ONCE", completionPolicy: "AUTO", definitionVersion: 2,
  rewardProfileCode: "RP_EXP_TINY_10", rewardExp: null, rewardStats: null, dueAt: null,
  semanticCategory: "RECORD", progressSource: "RECORD_CREATED", repeatPolicy: "ONCE", roleTemplateCode: null,
};
const definition: AdminQuestDefinition = { id: 501, ...blueprint };
const emptyDefinition: AdminQuestDefinition = {
  id: 502, ...blueprint, code: "quest:daily:walk", title: "Daily Walk", category: "DAILY", definitionVersion: 1,
};
const acceptance: AdminQuestAcceptance = {
  id: 9001, questId: 501, playerId: 10218, code: definition.code, title: definition.title, category: null,
  targetType: "COUNT", targetValue: 1, progressValue: 0, status: "IN_PROGRESS", completionPolicy: "AUTO", repeatRule: "ONCE",
  periodStart: null, periodEnd: null, acceptedAt: "2026-08-24T04:00:00Z", periodKey: null, goalReachedAt: null,
  completedAt: null, dueAt: null, semanticCategory: "RECORD", progressSource: "RECORD_CREATED", repeatPolicy: "ONCE", roleTemplateCode: null,
};
const completed: AdminQuestAcceptance = {
  ...acceptance, id: 9002, playerId: 10219, progressValue: 1, status: "COMPLETED",
  goalReachedAt: "2026-08-23T04:05:00Z", completedAt: "2026-08-23T04:05:00Z",
};
const unavailableCommands: AdminQuestCommandSource = { available: false };

function source(): AdminQuestDataSource {
  return {
    descriptor: { mode: "api", badge: "API", label: "/admin/v1", questLabel: "/admin/v1/quests" },
    getCatalog: vi.fn().mockResolvedValue({ blueprints: [blueprint] }),
    getDefinitions: vi.fn().mockResolvedValue({ definitions: [definition, emptyDefinition] }),
    getDefinition: vi.fn(async (code: string) => code === emptyDefinition.code ? emptyDefinition : definition),
    getAcceptances: vi.fn(async (code: string, status = "") => ({
      acceptances: code === emptyDefinition.code ? [] : [acceptance, completed].filter((item) => !status || item.status === status),
    })),
    getAcceptance: vi.fn().mockResolvedValue(acceptance),
  };
}

async function selectDefinition(code = definition.code) {
  fireEvent.click(await screen.findByRole("button", { name: code }));
  await waitFor(() => expect(document.getElementById("quest-definition-title")).toHaveFocus());
}

function renderQuest(dataSource: AdminQuestDataSource) {
  return render(<QuestRuntimeStatus access="ready" onLogin={vi.fn()} dataSource={dataSource} commandSource={unavailableCommands} />);
}

describe("read-only Quest Runtime Status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  });

  it("loads catalog and definitions, then separates explicit Definition and Acceptance loading", async () => {
    const dataSource = source();
    let resolveCatalog!: (value: { blueprints: AdminQuestBlueprint[] }) => void;
    vi.mocked(dataSource.getCatalog).mockReturnValue(new Promise((resolve) => { resolveCatalog = resolve; }));
    renderQuest(dataSource);

    expect(await screen.findByRole("heading", { name: "Loading Quest sources" })).toBeInTheDocument();
    await act(async () => resolveCatalog({ blueprints: [blueprint] }));
    expect(await screen.findByRole("button", { name: definition.code })).toBeInTheDocument();
    expect(dataSource.getDefinition).not.toHaveBeenCalled();

    await selectDefinition();
    expect(dataSource.getDefinition).toHaveBeenCalledWith(definition.code);
    expect(dataSource.getAcceptances).toHaveBeenCalledWith(definition.code);
    expect(screen.getByText("Definition configuration and player Acceptance runtime state remain separate. Quest completion does not automatically advance a QuestRoute.")).toBeInTheDocument();
    expect(screen.getByText("RP_EXP_TINY_10")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "9001" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /adjust|override|complete|repair|advance|publish|create|update/i })).not.toBeInTheDocument();
  });

  it("filters by the proven status values and opens an exact Acceptance detail", async () => {
    const dataSource = source();
    renderQuest(dataSource);
    await selectDefinition();

    fireEvent.click(screen.getByRole("button", { name: "9001" }));
    await waitFor(() => expect(document.getElementById("quest-acceptance-title")).toHaveFocus());
    expect(dataSource.getAcceptance).toHaveBeenCalledWith(9001);
    expect(within(document.getElementById("quest-acceptance-title")!.closest("aside")!).getByText("2026-08-24T04:00:00Z")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Operational command unavailable" })).toBeInTheDocument();
    expect(screen.getByText(/Mock mode remains read-only/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Acceptance status"), { target: { value: "COMPLETED" } });
    expect(await screen.findByRole("button", { name: "9002" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "9001" })).not.toBeInTheDocument();
    expect(dataSource.getAcceptances).toHaveBeenLastCalledWith(definition.code, "COMPLETED");
  });

  it("never exposes a mutation when the active read source is Mock", async () => {
    const dataSource = source();
    dataSource.descriptor = { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", questLabel: "Local Admin Mock" };
    const commandSource = { available: true, adjustProgress: vi.fn(), changeStatus: vi.fn() } satisfies AdminQuestCommandSource;
    render(<QuestRuntimeStatus access="ready" onLogin={vi.fn()} dataSource={dataSource} commandSource={commandSource} />);
    await selectDefinition();
    fireEvent.click(screen.getByRole("button", { name: "9001" }));

    expect(await screen.findByRole("heading", { name: "Operational command unavailable" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review operation" })).not.toBeInTheDocument();
    expect(commandSource.adjustProgress).not.toHaveBeenCalled();
    expect(commandSource.changeStatus).not.toHaveBeenCalled();
  });

  it("distinguishes an empty Quest from a status no-match", async () => {
    const dataSource = source();
    renderQuest(dataSource);
    await selectDefinition(emptyDefinition.code);

    expect(screen.getByRole("heading", { name: "No Quest Acceptances" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Acceptance status"), { target: { value: "COMPLETED" } });
    expect(await screen.findByRole("heading", { name: "No matching Acceptances" })).toBeInTheDocument();
  });

  it("retries the same source after an index error without switching to Mock", async () => {
    const dataSource = source();
    vi.mocked(dataSource.getCatalog).mockRejectedValueOnce(new Error("Network unavailable"));
    renderQuest(dataSource);

    expect(await screen.findByRole("heading", { name: "Unable to load Quest sources" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: definition.code })).toBeInTheDocument();
    expect(dataSource.getCatalog).toHaveBeenCalledTimes(2);
  });

  it.each([[401, "Authentication required"], [403, "Admin access denied"]] as const)("renders %s without cached Quest data", async (status, title) => {
    const dataSource = source();
    vi.mocked(dataSource.getCatalog).mockRejectedValueOnce(new ApiError(status, `HTTP_${status}`, "Denied"));
    renderQuest(dataSource);

    expect(await screen.findByRole("heading", { name: title })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: definition.code })).not.toBeInTheDocument();
  });

  it("withholds a mismatched Definition and retries the same Quest code", async () => {
    const dataSource = source();
    vi.mocked(dataSource.getDefinition)
      .mockResolvedValueOnce({ ...definition, code: "quest:wrong", title: "Wrong Definition" })
      .mockResolvedValueOnce(definition);
    renderQuest(dataSource);
    fireEvent.click(await screen.findByRole("button", { name: definition.code }));

    expect(await screen.findByText("Quest definition response did not match the requested Quest code.")).toBeInTheDocument();
    expect(screen.queryByText("Wrong Definition")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(document.getElementById("quest-definition-title")).toHaveFocus());
    expect(dataSource.getDefinition).toHaveBeenNthCalledWith(1, definition.code);
    expect(dataSource.getDefinition).toHaveBeenNthCalledWith(2, definition.code);
  });

  it("withholds an Acceptance list containing another Quest code", async () => {
    const dataSource = source();
    vi.mocked(dataSource.getAcceptances)
      .mockResolvedValueOnce({ acceptances: [{ ...acceptance, code: "quest:wrong" }] })
      .mockResolvedValueOnce({ acceptances: [acceptance] });
    renderQuest(dataSource);
    fireEvent.click(await screen.findByRole("button", { name: definition.code }));

    expect(await screen.findByText("Quest acceptance list contained another Quest code.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "9001" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "9001" })).toBeInTheDocument();
  });

  it("withholds a filtered Acceptance list containing another status and retries the same filter", async () => {
    const dataSource = source();
    renderQuest(dataSource);
    await selectDefinition();
    vi.mocked(dataSource.getAcceptances)
      .mockResolvedValueOnce({ acceptances: [acceptance] })
      .mockResolvedValueOnce({ acceptances: [completed] });

    fireEvent.change(screen.getByLabelText("Acceptance status"), { target: { value: "COMPLETED" } });

    expect(await screen.findByRole("heading", { name: "Unable to load Quest Acceptances" })).toBeInTheDocument();
    expect(screen.getByText("Quest acceptance list contained another Acceptance status.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "9001" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "9002" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("button", { name: "9002" })).toBeInTheDocument();
    expect(dataSource.getAcceptances).toHaveBeenNthCalledWith(2, definition.code, "COMPLETED");
    expect(dataSource.getAcceptances).toHaveBeenNthCalledWith(3, definition.code, "COMPLETED");
  });

  it("withholds mismatched Acceptance identity and selected Quest identity before rendering", async () => {
    const dataSource = source();
    vi.mocked(dataSource.getAcceptance)
      .mockResolvedValueOnce({ ...acceptance, id: 9999 })
      .mockResolvedValueOnce({ ...acceptance, code: "quest:wrong" })
      .mockResolvedValueOnce(acceptance);
    renderQuest(dataSource);
    await selectDefinition();
    fireEvent.click(screen.getByRole("button", { name: "9001" }));

    expect(await screen.findByText("Quest acceptance response did not match the requested Acceptance ID.")).toBeInTheDocument();
    expect(screen.queryByText("9999")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Quest acceptance response did not match the selected Quest code.")).toBeInTheDocument();
    expect(screen.queryByText("quest:wrong")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(document.getElementById("quest-acceptance-title")).toHaveFocus());
    expect(dataSource.getAcceptance).toHaveBeenNthCalledWith(1, 9001);
    expect(dataSource.getAcceptance).toHaveBeenNthCalledWith(2, 9001);
    expect(dataSource.getAcceptance).toHaveBeenNthCalledWith(3, 9001);
  });
});
