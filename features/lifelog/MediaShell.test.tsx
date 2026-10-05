import { answerDialog } from "@/shared/ui/dialogTest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { MediaInfo } from "@/shared/api/types";
import MediaShell from "./MediaShell";

const api = vi.hoisted(() => ({ advanceMediaApi: vi.fn(), createMediaApi: vi.fn(), deleteMediaApi: vi.fn(), markMediaStatusApi: vi.fn(), rateMediaApi: vi.fn(), rewatchMediaApi: vi.fn(), searchMediaApi: vi.fn(), updateMediaApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("./personalCategories", () => {
  const codes: Record<string, string[]> = {
    COLLECTION: ["FIGURE", "CARD", "BOOK", "GAME", "STAMP", "COIN", "PROJECT", "OTHER"],
    EXERCISE: ["RUNNING", "WALKING", "CYCLING", "SWIMMING", "GYM", "YOGA", "OTHER"],
    MEDIA: ["ANIME", "MOVIE", "SERIES", "BOOK", "WEBTOON", "GAME", "MUSIC"],
  };
  return {
    getMyLifeLogCategories: vi.fn(async (kind: string) => codes[kind].map((code, index) => ({ id: index + 1, kind, source: "SYSTEM", name: code, systemCode: code }))),
    getSystemLifeLogCategories: vi.fn(async (kind: string) => codes[kind].map((code) => ({ code, name: code }))),
    addSystemLifeLogCategory: vi.fn(), hideSystemLifeLogCategory: vi.fn(),
    createPersonalLifeLogCategory: vi.fn(), renamePersonalLifeLogCategory: vi.fn(), deletePersonalLifeLogCategory: vi.fn(),
    assignLifeLogRecordCategory: vi.fn(),
  };
});

const item: MediaInfo = { id: 51, playerId: 7, category: "ANIME", title: "Frieren", originalTitle: "葬送のフリーレン", currentEpisode: 10, totalEpisode: 28, status: "WATCHING", rating: 4.5, tags: ["fantasy"], rewatchCount: 1, startedOn: "2026-08-01", finishedOn: null, createdAt: "2026-08-01T00:00:00Z", updatedAt: "2026-08-10T00:00:00Z" };
beforeEach(() => {
  vi.clearAllMocks();
  api.searchMediaApi.mockResolvedValue([item]);
  api.updateMediaApi.mockImplementation(async (_id: number, body: object) => ({ ...item, ...body }));
  api.rateMediaApi.mockResolvedValue({ ...item, rating: 5 });
  api.advanceMediaApi.mockResolvedValue({ ...item, currentEpisode: 11 });
  api.markMediaStatusApi.mockResolvedValue({ ...item, status: "ON_HOLD" });
  api.rewatchMediaApi.mockResolvedValue({ ...item, rewatchCount: 2 });
});

it("분류를 먼저 보여주고 한 번 누르면 목록, 두 번 누르면 그 목록 슬롯의 생성 폼을 연다", async () => {
  api.searchMediaApi.mockResolvedValue([]);
  render(<MediaShell />);
  expect(screen.queryByText("감상 기록이 없습니다.")).not.toBeInTheDocument();
  const category = await screen.findByRole("button", { name: "애니메이션" });
  fireEvent.click(category, { detail: 0 });
  expect(await screen.findByText("감상 기록이 없습니다.")).toBeInTheDocument();
  expect(document.querySelector('[data-stage-key="lifelog-media-categories"]')).toBeInTheDocument();
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  expect(within(document.querySelector('[data-stage-key="lifelog-media-list"]') as HTMLElement).getByRole("button", { name: "감상 기록 저장" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "감상 목록으로" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "감상 목록으로" }));
  expect(screen.queryByRole("button", { name: "감상 기록 저장" })).not.toBeInTheDocument();
});

it("행 클릭은 읽기 전용, 밀기 수정은 명령·원제 지우기를 제공한다", async () => {
  render(<MediaShell />);
  fireEvent.click(await screen.findByRole("button", { name: "애니메이션" }));
  const row = await screen.findByRole("button", { name: /Frieren/ });
  fireEvent.click(row);
  const detail = document.querySelector('[data-stage-key="lifelog-media-detail"]') as HTMLElement;
  expect(within(detail).getByText("Frieren")).toBeInTheDocument();
  expect(within(detail).queryByRole("textbox", { name: "제목" })).not.toBeInTheDocument();
  expect(within(detail).queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  fireEvent.keyDown(row, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  expect(within(detail).getByRole("textbox", { name: "제목" })).toHaveValue("Frieren");
  fireEvent.change(screen.getByRole("spinbutton", { name: "평점" }), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "평점 저장" }));
  await waitFor(() => expect(api.rateMediaApi).toHaveBeenCalledWith(51, { score: 5 }));
  fireEvent.click(screen.getByRole("button", { name: "원제 지우기" }));
  await waitFor(() => expect(api.updateMediaApi).toHaveBeenCalledWith(51, { originalTitle: "" }));
});

it("삭제 취소는 유지하고 확정된 204는 목록과 상세에서 제거한다", async () => {
  api.searchMediaApi.mockResolvedValueOnce([item]).mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
  api.deleteMediaApi.mockResolvedValue(undefined);
  render(<MediaShell />);
  fireEvent.click(await screen.findByRole("button", { name: "애니메이션" }));
  const row = await screen.findByRole("button", { name: /Frieren/ });
  fireEvent.click(row);
  fireEvent.keyDown(row, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await answerDialog(false);
  expect(api.deleteMediaApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await answerDialog();
  await waitFor(() => expect(api.deleteMediaApi).toHaveBeenCalledWith(51));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Frieren/ })).not.toBeInTheDocument());
});
