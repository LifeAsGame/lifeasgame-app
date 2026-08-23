import { readFileSync } from "node:fs";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JournalPage, QuickRecordResult, RoleDetail } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import JournalShell from "./JournalShell";
import { journalMock, MOCK_JOURNAL_ENTRIES } from "./mock";

const api = vi.hoisted(() => ({
  getJournalDetailApi: vi.fn(),
  listJournalApi: vi.fn(),
  quickRecordApi: vi.fn(),
}));

vi.mock("./api", () => api);

const roles: RoleDetail[] = [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
  { id: 2, roleType: "FAMILY", name: "Family Member", description: "Be present", status: "ACTIVE", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", version: 0 },
];
const mixedPage = journalMock.page({ page: 0, size: 20 });
const quickResult: QuickRecordResult = {
  sourceType: "COLLECTION",
  sourceId: 999,
  recordedAt: "2026-08-14T00:00:00Z",
  replay: false,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function renderJournal() {
  const view = render(<JournalShell roles={roles} />);
  await screen.findAllByTestId("journal-entry");
  return view;
}

async function openQuickRecord() {
  await renderJournal();
  expect(document.querySelector('[data-stage-key="lifelog-quick-record"]')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Quick Record" }));
  return document.querySelector('[data-stage-key="lifelog-quick-record"]')!;
}

function selectQuickType(type: "COLLECTION" | "EXERCISE" | "MEDIA") {
  fireEvent.click(screen.getByRole("radio", { name: type }));
}

function expectDetail(name: string, value: string) {
  const term = screen.getByText(name);
  expect(term.nextElementSibling).toHaveTextContent(value);
}

describe("LifeLog Journal v7 surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listJournalApi.mockResolvedValue(mixedPage);
    api.getJournalDetailApi.mockImplementation(async (lifeLogId: number) => journalMock.detail(lifeLogId));
    api.quickRecordApi.mockResolvedValue(quickResult);
  });

  it("uses semantic Journal classes without legacy local styling", () => {
    const source = readFileSync("features/lifelog/JournalShell.tsx", "utf8");
    expect(source).toContain("lag-journal-surface");
    expect(source).not.toMatch(/INPUT_STYLE|\bSAO\b|GoldRow|<details/);

    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toContain('[data-stage-key="lifelog-journal"]');
    expect(css).toContain("var(--lag-control-bg)");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain(".lag-orb-column");
    const timestampStyles = css.match(/\.lag-journal-entry time\s*\{([^}]*)\}/)?.[1];
    expect(timestampStyles).toContain("color: var(--lag-text-2)");
    expect(timestampStyles).not.toContain("var(--lag-meta)");
  });

  it("renders the real server order as structured record cards", async () => {
    await renderJournal();

    const entries = screen.getAllByTestId("journal-entry");
    expect(entries.map((entry) => entry.querySelector("strong")?.textContent)).toEqual([
      "Architecture Notes",
      "RUNNING · 2026-08-12",
      "Designing Data-Intensive Applications",
      "Legacy Collection",
    ]);
    expect(within(entries[0]).getByText("COLLECTION")).toBeInTheDocument();
    expect(within(entries[0]).getByText("Backend Engineer")).toBeInTheDocument();
    expect(within(entries[0]).getByText("Event #11")).toBeInTheDocument();
    expect(within(entries[1]).getByText("Quick")).toBeInTheDocument();
  });

  it("keeps nullable metrics absent while preserving real zero values", async () => {
    api.listJournalApi.mockResolvedValue({
      content: [{
        ...MOCK_JOURNAL_ENTRIES[1],
        preview: { ...MOCK_JOURNAL_ENTRIES[1].preview, durationMinutes: 0, distanceKm: null, calories: 240 },
      }],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
    } satisfies JournalPage);
    await renderJournal();

    const entry = screen.getByTestId("journal-entry");
    expect(entry).toHaveTextContent("0 min · 240 kcal");
    expect(entry).not.toHaveTextContent("km");
  });

  it("changes Role/subtype query immediately and preserves bounded pagination", async () => {
    api.listJournalApi.mockImplementation(async (params: { primaryRoleId?: number; subtype?: string; page: number; size: number }): Promise<JournalPage> => ({
      content: MOCK_JOURNAL_ENTRIES.filter((entry) =>
        (params.primaryRoleId === undefined || entry.primaryRoleId === params.primaryRoleId)
        && (params.subtype === undefined || entry.subtype === params.subtype)
      ),
      page: params.page,
      size: params.size,
      totalElements: 40,
      totalPages: 2,
    }));
    await renderJournal();

    expect(screen.getByText("Page 1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Role filter"), { target: { value: "2" } });
    await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, page: 0, size: 20 }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, page: 1, size: 20 }));
    expect(await screen.findByText("Page 2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Subtype filter"), { target: { value: "REFLECTION" } });
    await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, subtype: "REFLECTION", page: 0, size: 20 }));
  });

  it("opens detail only after selection, keeps its stage stable across entries, and Back closes it", async () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    await renderJournal();
    expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).not.toBeInTheDocument();
    const entries = screen.getAllByTestId("journal-entry");

    fireEvent.click(entries[0]);
    await screen.findByText("Annotated");
    const detailStage = document.querySelector('[data-stage-key="lifelog-journal-detail"]');
    expect(detailStage).toBeInTheDocument();
    expectDetail("Condition", "Annotated");

    focus.mockClear();
    fireEvent.click(entries[1]);
    await screen.findByText("Morning run");
    expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).toBe(detailStage);
    expectDetail("Entry mode", "QUICK");
    expect(focus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Back to Journal" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).not.toBeInTheDocument());
    expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "lifelog-journal", align: "back" } });
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("renders all current detail fields in semantic common/source sections", async () => {
    await renderJournal();
    const entries = screen.getAllByTestId("journal-entry");

    fireEvent.click(entries[3]);
    await screen.findByText("Collection");
    expectDetail("Original title", "Not recorded");
    expectDetail("Quantity", "Not recorded");
    expectDetail("Condition", "Not recorded");
    expectDetail("Acquired from", "Not recorded");
    expectDetail("Tags", "Not recorded");

    fireEvent.click(entries[2]);
    await screen.findByText("Rewatch count");
    expectDetail("Rewatch count", "0");
    expect(screen.queryByRole("button", { name: /edit|delete|complete event/i })).not.toBeInTheDocument();
  });

  it("keeps detail loading/error retry on the selected lifeLogId", async () => {
    const first = deferred<ReturnType<typeof journalMock.detail>>();
    api.getJournalDetailApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce(journalMock.detail(104));
    await renderJournal();
    fireEvent.click(screen.getAllByTestId("journal-entry")[0]);
    expect(screen.getByText("Loading Journal detail...")).toBeInTheDocument();

    await act(async () => {
      first.reject(new Error("Detail unavailable"));
      await first.promise.catch(() => undefined);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("Detail unavailable");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await screen.findByText("Annotated");
    expect(api.getJournalDetailApi).toHaveBeenNthCalledWith(1, 104);
    expect(api.getJournalDetailApi).toHaveBeenNthCalledWith(2, 104);
  });

  it("does not reopen stale detail after leaving and returning", async () => {
    const view = await renderJournal();
    fireEvent.click(screen.getAllByTestId("journal-entry")[0]);
    await screen.findByText("Annotated");
    view.unmount();

    await renderJournal();
    expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).not.toBeInTheDocument();
  });

  it("opens Quick Record explicitly, keeps its frame stable across real types, and Back returns", async () => {
    const stage = await openQuickRecord();
    const frame = stage.querySelector(".lag-panel-frame");
    expect(screen.getByRole("radio", { name: "COLLECTION" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Collection category")).toBeInTheDocument();

    selectQuickType("EXERCISE");
    expect(screen.getByLabelText("Duration minutes")).toBeInTheDocument();
    expect(document.querySelector('[data-stage-key="lifelog-quick-record"] .lag-panel-frame')).toBe(frame);
    selectQuickType("MEDIA");
    expect(screen.getByLabelText("Media status")).toBeInTheDocument();
    expect(document.querySelector('[data-stage-key="lifelog-quick-record"] .lag-panel-frame')).toBe(frame);

    fireEvent.click(screen.getByRole("button", { name: "Back to Journal" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="lifelog-quick-record"]')).not.toBeInTheDocument());
  });

  it("represents every current Quick Record type-specific field", async () => {
    await openQuickRecord();
    expect(screen.getByLabelText("Collection category")).toBeInTheDocument();
    expect(screen.getByLabelText("Collection title")).toBeInTheDocument();
    expect(screen.getByLabelText("Quantity")).toBeInTheDocument();

    selectQuickType("EXERCISE");
    for (const name of ["Exercise category", "Duration minutes", "Exercised on", "Distance km", "Calories", "Memo"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }

    selectQuickType("MEDIA");
    for (const name of ["Media category", "Media title", "Media status", "Current episode", "Total episodes"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("submits the exact Collection contract and shows success", async () => {
    await openQuickRecord();
    fireEvent.change(screen.getByLabelText("Quick Record subtype"), { target: { value: "PROJECT" } });
    fireEvent.change(screen.getByLabelText("Quick Record role"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Collection category"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("Collection title"), { target: { value: "The Pragmatic Programmer" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

    await screen.findByText("✓ Quick Record saved.");
    expect(api.quickRecordApi).toHaveBeenCalledWith({
      type: "COLLECTION",
      lifeLogSubtype: "PROJECT",
      primaryRoleId: 2,
      collection: { category: "BOOK", title: "The Pragmatic Programmer", quantity: 1 },
    }, expect.stringMatching(/^[0-9a-f-]{36}$/i));
  });

  it("preserves Exercise zero/optional semantics and Media partial progress", async () => {
    await openQuickRecord();
    selectQuickType("EXERCISE");
    fireEvent.change(screen.getByLabelText("Exercise category"), { target: { value: "RUNNING" } });
    fireEvent.change(screen.getByLabelText("Duration minutes"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Exercised on"), { target: { value: "2026-08-14" } });
    fireEvent.change(screen.getByLabelText("Distance km"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Calories"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));
    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
    expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
      type: "EXERCISE",
      exercise: { category: "RUNNING", durationMinutes: 30, exercisedOn: "2026-08-14", distanceKm: 0, calories: 0 },
    });

    api.quickRecordApi.mockClear();
    selectQuickType("MEDIA");
    fireEvent.change(screen.getByLabelText("Media category"), { target: { value: "ANIME" } });
    fireEvent.change(screen.getByLabelText("Media title"), { target: { value: "Frieren" } });
    fireEvent.change(screen.getByLabelText("Media status"), { target: { value: "WATCHING" } });
    fireEvent.change(screen.getByLabelText("Current episode"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));
    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
    expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
      type: "MEDIA",
      media: { category: "ANIME", title: "Frieren", status: "WATCHING", currentEpisode: 0 },
    });
  });

  it("keeps failure retry available and edit creates a new logical submission", async () => {
    api.quickRecordApi.mockRejectedValueOnce(new Error("Outcome unknown")).mockResolvedValueOnce(quickResult);
    await openQuickRecord();
    fireEvent.change(screen.getByLabelText("Collection category"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("Collection title"), { target: { value: "Retry me" } });
    fireEvent.change(screen.getByLabelText("Quantity"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));

    await screen.findByRole("button", { name: "Retry same record" });
    expect(screen.getByRole("alert")).toHaveTextContent("Outcome unknown");
    const firstKey = api.quickRecordApi.mock.calls[0][1];
    fireEvent.change(screen.getByLabelText("Collection title"), { target: { value: "Edited retry" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Quick Record" }));
    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledTimes(2));
    expect(api.quickRecordApi.mock.calls[1][0]).toEqual({
      type: "COLLECTION",
      collection: { category: "BOOK", title: "Edited retry", quantity: 1 },
    });
    expect(api.quickRecordApi.mock.calls[1][1]).not.toBe(firstKey);
  });

  it("does not reopen stale Quick Record after leaving and returning", async () => {
    const view = await renderJournal();
    fireEvent.click(screen.getByRole("button", { name: "Quick Record" }));
    expect(document.querySelector('[data-stage-key="lifelog-quick-record"]')).toBeInTheDocument();
    view.unmount();

    await renderJournal();
    expect(document.querySelector('[data-stage-key="lifelog-quick-record"]')).not.toBeInTheDocument();
  });
});
