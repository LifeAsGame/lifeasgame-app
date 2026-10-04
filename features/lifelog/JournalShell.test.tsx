import { readFileSync } from "node:fs";
import { consumerLabel } from "@/shared/lib/consumerLabels";
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

let journalView: ReturnType<typeof render>;
let createSequence = 0;
function requestQuickRecord() { journalView.rerender(<JournalShell roles={roles} createRequest={++createSequence} />); }

async function renderJournal() {
  const view = render(<JournalShell roles={roles} />);
  journalView = view;
  await screen.findAllByTestId("journal-entry");
  return view;
}

async function openQuickRecord() {
  await renderJournal();
  expect(document.querySelector('[data-create-form]')).not.toBeInTheDocument();
  requestQuickRecord();
  return document.querySelector('[data-stage-key="lifelog-journal"]')!;
}

function selectQuickType(type: "COLLECTION" | "EXERCISE" | "MEDIA") {
  fireEvent.click(screen.getByRole("radio", { name: consumerLabel(type) }));
}

function expectDetail(name: string, value: string) {
  const term = screen.getByText(name);
  expect(term.nextElementSibling).toHaveTextContent(value);
}

describe("LifeLog Journal consumer surface", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    api.listJournalApi.mockResolvedValue(mixedPage);
    api.getJournalDetailApi.mockImplementation(async (lifeLogId: number) => journalMock.detail(lifeLogId));
    api.quickRecordApi.mockResolvedValue(quickResult);
  });

  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.listJournalApi.mockReset().mockResolvedValue({ ...mixedPage, content: [], totalElements: 0, totalPages: 0 });
    journalView = render(<JournalShell roles={roles} />);
    await screen.findByText("일상 기록이 없습니다.");
    expect(screen.getByText("페이지 1 / 1")).toBeInTheDocument();
    const slot = document.querySelector(".lag-create-slot");
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    requestQuickRecord();
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("일상 기록이 없습니다.")).toBeVisible());
  });

  it("uses semantic Journal classes without legacy local styling", () => {
    const source = readFileSync("features/lifelog/JournalShell.tsx", "utf8");
    expect(source).toContain("lag-journal-surface");
    expect(source).not.toMatch(/INPUT_STYLE|\bSAO\b|GoldRow/);

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
      "달리기 · 2026-08-12",
      "Designing Data-Intensive Applications",
      "Legacy Collection",
    ]);
    expect(within(entries[0]).getByText("수집 기록")).toBeInTheDocument();
    expect(entries[0].querySelector(".lag-journal-entry-summary")).toHaveTextContent("도서 · 수량 1");
    expect(within(entries[0]).getByText("Backend Engineer")).toBeInTheDocument();
    expect(within(entries[0]).getByText("일정 #11")).toBeInTheDocument();
    expect(within(entries[1]).getByText("간편")).toBeInTheDocument();
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
    expect(entry).toHaveTextContent("0 분 · 240 kcal");
    expect(entry).not.toHaveTextContent("km");
  });

  it("changes 역할/subtype query immediately and preserves bounded pagination", async () => {
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

    expect(screen.getByText("페이지 1 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("역할 필터"), { target: { value: "2" } });
    await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, page: 0, size: 20 }));
    fireEvent.click(screen.getByRole("button", { name: "다음" }));
    await waitFor(() => expect(api.listJournalApi).toHaveBeenLastCalledWith({ primaryRoleId: 2, page: 1, size: 20 }));
    expect(await screen.findByText("페이지 2 / 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("기록 분류 필터"), { target: { value: "REFLECTION" } });
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
    expectDetail("상태 메모", "Annotated");

    focus.mockClear();
    fireEvent.click(entries[1]);
    await screen.findByText("Morning run");
    expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).toBe(detailStage);
    expectDetail("기록 방식", "간편 기록");
    expect(focus).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "일상 기록 목록으로" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).not.toBeInTheDocument());
    expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "lifelog-journal", align: "back" } });
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("opens the Home-selected record once without requiring a list click", async () => {
    render(<JournalShell roles={roles} initialLifeLogId={104} />);
    await screen.findByText("Annotated");
    expect(api.getJournalDetailApi).toHaveBeenCalledTimes(1);
    expect(api.getJournalDetailApi).toHaveBeenCalledWith(104);
  });

  it("renders all current detail fields in semantic common/source sections", async () => {
    await renderJournal();
    const entries = screen.getAllByTestId("journal-entry");

    fireEvent.click(entries[3]);
    await screen.findAllByText("수집 기록");
    expectDetail("원제", "미등록");
    expectDetail("수량", "미등록");
    expectDetail("상태 메모", "미등록");
    expectDetail("입수처", "미등록");
    expectDetail("태그", "미등록");

    fireEvent.click(entries[2]);
    await screen.findByText("재감상 횟수");
    expectDetail("재감상 횟수", "0");
    expect(screen.queryByRole("button", { name: /edit|delete|complete event/i })).not.toBeInTheDocument();
  });

  it("keeps detail loading/error retry on the selected lifeLogId", async () => {
    const first = deferred<ReturnType<typeof journalMock.detail>>();
    api.getJournalDetailApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce(journalMock.detail(104));
    await renderJournal();
    fireEvent.click(screen.getAllByTestId("journal-entry")[0]);
    expect(screen.getByText("일상 기록 상세를 불러오는 중…")).toBeInTheDocument();

    await act(async () => {
      first.reject(new Error("설명 unavailable"));
      await first.promise.catch(() => undefined);
    });
    expect(screen.getByRole("alert")).toHaveTextContent("설명 unavailable");
    fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

    await screen.findByText("Annotated");
    expect(api.getJournalDetailApi).toHaveBeenNthCalledWith(1, 104);
    expect(api.getJournalDetailApi).toHaveBeenNthCalledWith(2, 104);
  });

  it("생성 취소는 기존 선택을 유지하며 상세를 다시 열지 않고 분류로 포커스를 돌린다", async () => {
    await renderJournal();
    const entry = screen.getAllByTestId("journal-entry")[0];
    fireEvent.click(entry);
    await screen.findByText("Annotated");
    requestQuickRecord();
    fireEvent.keyDown(screen.getByLabelText("수집 제목"), { key: "Escape" });
    await waitFor(() => expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).not.toBeInTheDocument());
    expect(entry).toHaveAttribute("aria-pressed", "true");

  });

  it("does not reopen stale detail after leaving and returning", async () => {
    const view = await renderJournal();
    fireEvent.click(screen.getAllByTestId("journal-entry")[0]);
    await screen.findByText("Annotated");
    view.unmount();

    await renderJournal();
    expect(document.querySelector('[data-stage-key="lifelog-journal-detail"]')).not.toBeInTheDocument();
  });

  it("통합 상세에서 실제 원본 종류와 ID를 전달한다", async () => {
    const openSource = vi.fn();
    render(<JournalShell roles={roles} onOpenSource={openSource} />);
    fireEvent.click((await screen.findAllByTestId("journal-entry"))[0]);
    await screen.findByRole("button", { name: "원본에서 수정·삭제" });
    fireEvent.click(screen.getByRole("button", { name: "원본에서 수정·삭제" }));
    expect(openSource).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "COLLECTION", sourceId: expect.any(Number) }));
  });

  it("opens 간편 기록 explicitly, keeps its frame stable across real types, and Back returns", async () => {
    const stage = await openQuickRecord();
    const frame = stage.querySelector(".lag-panel-frame");
    expect(screen.getByRole("radio", { name: "수집 기록" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("수집 분류")).toBeInTheDocument();

    selectQuickType("EXERCISE");
    expect(screen.getByLabelText("운동 시간 (분)")).toBeInTheDocument();
    expect(document.querySelector('[data-stage-key="lifelog-journal"] .lag-panel-frame')).toBe(frame);
    selectQuickType("MEDIA");
    expect(screen.getByLabelText("감상 상태")).toBeInTheDocument();
    expect(document.querySelector('[data-stage-key="lifelog-journal"] .lag-panel-frame')).toBe(frame);

    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    await waitFor(() => expect(document.querySelector('[data-create-form]')).not.toBeInTheDocument());
  });

  it("keeps mobile 간편 기록 labels and its Save action in the shared scroll contract", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const panelFrame = readFileSync("widgets/right-panels/ui/PanelFrame.tsx", "utf8");
    const mobile = css.slice(css.indexOf("@media (max-width: 767px)"));

    expect(mobile).toMatch(/\.lag-journal-segments\s*{[^}]*display:\s*grid;[^}]*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(mobile).toMatch(/@media \(max-width: 380px\)[\s\S]*repeat\(2, minmax\(0, 1fr\)\)/);
    expect(mobile).toMatch(/\.lag-panel-stage\[data-camera-active="true"\][\s\S]*?> \.lag-panel-frame\s*{[^}]*width:\s*100% !important/);
    expect(css).toMatch(/\.lag-panel-body\s*{[^}]*overflow-y:\s*auto/);
    expect(mobile).toMatch(/\.lag-panel-body\s*{[^}]*padding-bottom:\s*calc\(82px \+ env\(safe-area-inset-bottom\)\) !important/);
    expect(panelFrame).toContain("panelContentBottomSafePadding");
  });

  it("represents every current 간편 기록 type-specific field", async () => {
    await openQuickRecord();
    expect(screen.getByLabelText("수집 분류")).toBeInTheDocument();
    expect(screen.getByLabelText("수집 제목")).toBeInTheDocument();
    expect(screen.getByLabelText("수량")).toBeInTheDocument();

    selectQuickType("EXERCISE");
    for (const name of ["운동 분류", "운동 시간 (분)", "운동 날짜", "거리 (km)", "칼로리", "메모"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }

    selectQuickType("MEDIA");
    for (const name of ["감상 분류", "감상 제목", "감상 상태", "현재 회차", "전체 회차"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it("submits the exact 수집 기록 contract and shows success", async () => {
    await openQuickRecord();
    fireEvent.change(screen.getByLabelText("간편 기록 분류"), { target: { value: "PROJECT" } });
    fireEvent.change(screen.getByLabelText("간편 기록 역할"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("수집 분류"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("수집 제목"), { target: { value: "The Pragmatic Programmer" } });
    fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));

    await waitFor(() => expect(screen.queryByLabelText("수집 제목")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.queryByLabelText("수집 제목")).not.toBeInTheDocument());
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    expect(api.quickRecordApi).toHaveBeenCalledWith({
      type: "COLLECTION",
      lifeLogSubtype: "PROJECT",
      primaryRoleId: 2,
      collection: { category: "BOOK", title: "The Pragmatic Programmer", quantity: 1 },
    }, expect.stringMatching(/^[0-9a-f-]{36}$/i));
  });

  it("maps the existing REFLECTION subtype to weekly lookback", async () => {
    await openQuickRecord();
    fireEvent.change(screen.getByLabelText("간편 기록 분류"), { target: { value: "REFLECTION" } });
    fireEvent.change(screen.getByLabelText("수집 분류"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("수집 제목"), { target: { value: "Weekly notes" } });
    fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));

    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.queryByLabelText("수집 제목")).not.toBeInTheDocument());
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
      type: "COLLECTION",
      lifeLogSubtype: "REFLECTION",
      reflectionScope: "WEEKLY_LOOKBACK",
      collection: { category: "BOOK", title: "Weekly notes", quantity: 1 },
    });
  });

  it("preserves 운동 기록 zero/optional semantics and 감상 기록 partial progress", async () => {
    await openQuickRecord();
    selectQuickType("EXERCISE");
    fireEvent.change(screen.getByLabelText("운동 분류"), { target: { value: "RUNNING" } });
    fireEvent.change(screen.getByLabelText("운동 시간 (분)"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("운동 날짜"), { target: { value: "2026-08-14" } });
    fireEvent.change(screen.getByLabelText("거리 (km)"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("칼로리"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));
    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
    expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
      type: "EXERCISE",
      exercise: { category: "RUNNING", durationMinutes: 30, exercisedOn: "2026-08-14", distanceKm: 0, calories: 0 },
    });

    api.quickRecordApi.mockClear();
    requestQuickRecord();
    selectQuickType("MEDIA");
    fireEvent.change(screen.getByLabelText("감상 분류"), { target: { value: "ANIME" } });
    fireEvent.change(screen.getByLabelText("감상 제목"), { target: { value: "Frieren" } });
    fireEvent.change(screen.getByLabelText("감상 상태"), { target: { value: "WATCHING" } });
    fireEvent.change(screen.getByLabelText("현재 회차"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));
    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledOnce());
    expect(api.quickRecordApi.mock.calls[0][0]).toEqual({
      type: "MEDIA",
      media: { category: "ANIME", title: "Frieren", status: "WATCHING", currentEpisode: 0 },
    });
  });

  it("keeps failure retry available and edit creates a new logical submission", async () => {
    api.quickRecordApi.mockRejectedValueOnce(new Error("Outcome unknown")).mockResolvedValueOnce(quickResult);
    await openQuickRecord();
    fireEvent.change(screen.getByLabelText("수집 분류"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("수집 제목"), { target: { value: "다시 시도 me" } });
    fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));

    await screen.findByRole("button", { name: "같은 기록 다시 시도" });
    expect(screen.getByRole("alert")).toHaveTextContent("Outcome unknown");
    expect(screen.getByRole("alert")).toHaveFocus();
    const firstKey = api.quickRecordApi.mock.calls[0][1];
    fireEvent.change(screen.getByLabelText("수집 제목"), { target: { value: "Edited retry" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));
    await waitFor(() => expect(api.quickRecordApi).toHaveBeenCalledTimes(2));
    expect(api.quickRecordApi.mock.calls[1][0]).toEqual({
      type: "COLLECTION",
      collection: { category: "BOOK", title: "Edited retry", quantity: 1 },
    });
    expect(api.quickRecordApi.mock.calls[1][1]).not.toBe(firstKey);
  });

  it("does not reopen stale 간편 기록 after leaving and returning", async () => {
    const view = await renderJournal();
    requestQuickRecord();
    expect(document.querySelector('[data-create-form]')).toBeInTheDocument();
    view.unmount();

    await renderJournal();
    expect(document.querySelector('[data-create-form]')).not.toBeInTheDocument();
  });
  it("preserves a new draft after leaving a pending save and supports keyboard type selection", async () => {
    const request = deferred<QuickRecordResult>();
    api.quickRecordApi.mockReturnValueOnce(request.promise);
    await openQuickRecord();
    fireEvent.change(screen.getByLabelText("수집 분류"), { target: { value: "BOOK" } });
    fireEvent.change(screen.getByLabelText("수집 제목"), { target: { value: "Old draft" } });
    fireEvent.change(screen.getByLabelText("수량"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: "간편 기록 저장" }));
    await screen.findByRole("button", { name: "저장 중…" });
    expect(screen.getByRole("status")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    await waitFor(() => expect(document.querySelector('[data-create-form]')).not.toBeInTheDocument());
    requestQuickRecord();
    expect(screen.getByRole("radio", { name: "수집 기록" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("radio", { name: "수집 기록" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "운동 기록" })).toHaveFocus();
    fireEvent.change(screen.getByLabelText("메모"), { target: { value: "New draft stays" } });
    await act(async () => { request.resolve(quickResult); await request.promise; });
    expect(screen.getByLabelText("메모")).toHaveValue("New draft stays");
    expect(screen.queryByText(/Quick Record saved/)).not.toBeInTheDocument();
    expect(api.quickRecordApi).toHaveBeenCalledOnce();
    expect(api.getJournalDetailApi).not.toHaveBeenCalled();
  });

  it("moves mobile keyboard focus into the detail while it loads", async () => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    api.getJournalDetailApi.mockReturnValue(new Promise(() => {}));
    await renderJournal();
    fireEvent.click(screen.getAllByTestId("journal-entry")[0]);
    expect(screen.getByRole("button", { name: "일상 기록 목록으로" })).toHaveFocus();
    expect(screen.getByText("일상 기록 상세를 불러오는 중…")).toBeInTheDocument();
  });

});
