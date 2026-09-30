import { answerDialog } from "@/shared/ui/dialogTest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MEDIA_CATEGORIES, MEDIA_STATUSES, type MediaInfo } from "@/shared/api/types";
import MediaShell from "./MediaShell";

const api = vi.hoisted(() => ({ advanceMediaApi: vi.fn(), createMediaApi: vi.fn(), deleteMediaApi: vi.fn(), markMediaStatusApi: vi.fn(), rateMediaApi: vi.fn(), rewatchMediaApi: vi.fn(), searchMediaApi: vi.fn(), updateMediaApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, onClick }: { label: string; onClick: () => void }) => <button type="button" data-testid="media-entry" onClick={onClick}>{label}</button> }));

const item: MediaInfo = { id: 51, playerId: 7, category: "ANIME", title: "Frieren", originalTitle: "葬送のフリーレン", currentEpisode: 10, totalEpisode: 28, status: "WATCHING", rating: 4.5, tags: ["fantasy"], rewatchCount: 1, startedOn: "2026-08-01", finishedOn: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-10T00:00:00Z" };
const completed: MediaInfo = { ...item, id: 52, title: "Complete", currentEpisode: 28, status: "COMPLETED" };

describe("감상 기록 source surface를 사용할 때", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.clearAllMocks();
    api.searchMediaApi.mockResolvedValue([item, completed]);
    api.updateMediaApi.mockImplementation(async (_id: number, body: object) => ({ ...item, ...body }));
    api.rateMediaApi.mockResolvedValue({ ...item, rating: 5 });
    api.advanceMediaApi.mockResolvedValue({ ...item, currentEpisode: 11 });
    api.markMediaStatusApi.mockResolvedValue({ ...item, status: "ON_HOLD" });
    api.rewatchMediaApi.mockResolvedValue({ ...item, rewatchCount: 2 });
  });

  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.searchMediaApi.mockReset().mockResolvedValue([]);
    render(<MediaShell />);
    await screen.findByText("감상 기록이 없습니다.");
    const category = screen.getByRole("button", { name: "감상 기록" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("감상 기록이 없습니다.")).toBeVisible());
  });

  it("exact selected commands와 CRUD controls를 노출하고 completed advance를 막는다", async () => {
    render(<MediaShell />);
    const [entry, completeEntry] = await screen.findAllByTestId("media-entry");
    expect(Array.from((screen.getByLabelText("분류 필터") as HTMLSelectElement).options, ({ value }) => value).slice(1)).toEqual([...MEDIA_CATEGORIES]);
    expect(Array.from((screen.getByLabelText("상태 필터") as HTMLSelectElement).options, ({ value }) => value).slice(1)).toEqual([...MEDIA_STATUSES]);
    expect(screen.queryByText(/PLANNING|READING|PLAN_TO_WATCH/)).not.toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("button", { name: "감상 기록" }), { key: "Enter", altKey: true });
    expect(screen.getByLabelText("등록할 분류")).toBeRequired();
    expect(screen.getByLabelText("상태")).toBeRequired();
    expect(screen.queryByLabelText(/rating|lifeLogSubtype|reflectionScope|primaryRoleId|roleEventId/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    fireEvent.click(entry);
    expect(screen.getByText("감상 기록 #51")).toBeInTheDocument();
    expect(screen.getByText("평점: 4.5")).toBeInTheDocument();
    expect(screen.getByText("재감상 횟수: 1")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("평점"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "평점 저장" }));
    await waitFor(() => expect(api.rateMediaApi).toHaveBeenCalledWith(51, { score: 5 }));
    fireEvent.click(screen.getByRole("button", { name: "다음 회차" }));
    await waitFor(() => expect(api.advanceMediaApi).toHaveBeenCalledWith(51, { step: 1 }));
    fireEvent.click(screen.getByRole("button", { name: "상태 저장" }));
    expect(api.markMediaStatusApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("변경할 진행 상태"), { target: { value: "ON_HOLD" } });
    fireEvent.click(screen.getByRole("button", { name: "상태 저장" }));
    await waitFor(() => expect(api.markMediaStatusApi).toHaveBeenCalledWith(51, { status: "ON_HOLD" }));
    fireEvent.click(screen.getByRole("button", { name: "다시 감상" }));
    await waitFor(() => expect(api.rewatchMediaApi).toHaveBeenCalledWith(51));

    fireEvent.click(screen.getByRole("button", { name: "원제 지우기" }));
    await waitFor(() => expect(api.updateMediaApi).toHaveBeenCalledWith(51, { originalTitle: "" }));
    fireEvent.click(screen.getByRole("button", { name: "태그 지우기" }));
    await waitFor(() => expect(api.updateMediaApi).toHaveBeenLastCalledWith(51, { tags: [] }));
    fireEvent.click(completeEntry);
    expect(screen.getByRole("button", { name: "다음 회차" })).toBeDisabled();
  });

  it("select filter는 즉시, title query는 debounce하고 filter 변경 시 detail을 닫는다", async () => {
    render(<MediaShell />);
    const entry = (await screen.findAllByTestId("media-entry"))[0];
    expect(document.querySelector('[data-stage-key="lifelog-media-detail"]')).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "검색" })).not.toBeInTheDocument();

    fireEvent.click(entry);
    expect(document.querySelector('[data-stage-key="lifelog-media-detail"]')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("분류 필터"), { target: { value: "BOOK" } });
    await waitFor(() => expect(document.querySelector('[data-stage-key="lifelog-media-detail"]')).not.toBeInTheDocument());
    await waitFor(() => expect(api.searchMediaApi).toHaveBeenLastCalledWith({ category: "BOOK", page: 0, size: 20 }));

    const calls = api.searchMediaApi.mock.calls.length;
    fireEvent.change(screen.getByLabelText("제목 검색"), { target: { value: "Architecture" } });
    expect(api.searchMediaApi).toHaveBeenCalledTimes(calls);
    await waitFor(() => expect(api.searchMediaApi).toHaveBeenLastCalledWith({ category: "BOOK", titleLike: "Architecture", page: 0, size: 20 }));
  });

  it("uses semantic controls for Add 감상 기록 without a new theme palette", () => {
    const source = readFileSync("features/lifelog/MediaShell.tsx", "utf8");
    expect(source).toContain("SEMANTIC_CONTROL_STYLE");
    expect(source).toContain("CreateCategory");
    expect(source).not.toContain("INPUT_STYLE");
  });

  it("SAO confirm cancel leaves the row; confirmed 204 removes it without an error", async () => {
    api.searchMediaApi.mockReset().mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
    api.deleteMediaApi.mockResolvedValue(undefined);
    render(<MediaShell />);
    fireEvent.click(await screen.findByTestId("media-entry"));
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog(false);
    expect(api.deleteMediaApi).not.toHaveBeenCalled();
    expect(screen.getByText("감상 기록 #51")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog();
    await waitFor(() => expect(api.deleteMediaApi).toHaveBeenCalledWith(item.id));
    await waitFor(() => expect(screen.queryByTestId("media-entry")).not.toBeInTheDocument());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    const exitingDetail = document.querySelector('[data-stage-key="lifelog-media-detail"]');
    if (exitingDetail) expect(exitingDetail).toHaveAttribute("aria-hidden", "true");
  });
});
