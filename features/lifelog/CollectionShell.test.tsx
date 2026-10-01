import { answerDialog } from "@/shared/ui/dialogTest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { CollectionInfo } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import CollectionShell from "./CollectionShell";

const api = vi.hoisted(() => ({
  createCollectionApi: vi.fn(), deleteCollectionApi: vi.fn(), getCollectionApi: vi.fn(),
  searchCollectionsApi: vi.fn(), updateCollectionApi: vi.fn(),
}));
vi.mock("./api", () => api);

const item: CollectionInfo = {
  id: 31, playerId: 7, category: "BOOK", title: "Architecture Notes", originalTitle: null,
  quantity: 1, conditionNote: "Annotated", acquiredFrom: null, tags: [],
  createdAt: "2026-08-12T09:00:00Z", updatedAt: "2026-08-12T09:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  Element.prototype.scrollIntoView = vi.fn();
  api.searchCollectionsApi.mockResolvedValue([item]);
  api.getCollectionApi.mockResolvedValue(item);
  api.createCollectionApi.mockResolvedValue({ id: 99 });
  api.updateCollectionApi.mockResolvedValue({ ...item, quantity: 2 });
  api.deleteCollectionApi.mockResolvedValue(undefined);
});

it("starts with kinds and loads only the selected server category", async () => {
  render(<CollectionShell />);
  expect(screen.getByRole("heading", { name: "수집 종류" })).toBeInTheDocument();
  expect(api.searchCollectionsApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "도서" }), { detail: 1 });
  await waitFor(() => expect(api.searchCollectionsApi).toHaveBeenCalledWith({ page: 0, size: 20, category: "BOOK", titleLike: undefined }));
  expect(await screen.findByRole("button", { name: /Architecture Notes/ })).toBeInTheDocument();
});

it("removes the previous kind's rows while the next kind loads", async () => {
  const figure = { ...item, id: 32, category: "FIGURE" as const, title: "Figure Shelf" };
  let finishFigure: (items: CollectionInfo[]) => void = () => {};
  api.searchCollectionsApi.mockImplementation(({ category }: { category: string }) => category === "FIGURE"
    ? new Promise<CollectionInfo[]>((resolve) => { finishFigure = resolve; })
    : Promise.resolve([item]));
  render(<CollectionShell />);
  fireEvent.click(screen.getByRole("button", { name: "도서" }));
  fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes/ }));
  expect(await screen.findByText("수집 기록 #31")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "피규어" }));
  expect(screen.getByRole("heading", { name: "피규어 목록" })).toBeInTheDocument();
  expect(screen.getByText("수집 기록을 불러오는 중…")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Architecture Notes/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "수집 기록 수정" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "수정" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "삭제" })).not.toBeInTheDocument();
  await act(async () => { finishFigure([figure]); });
  expect(screen.getByRole("button", { name: /Figure Shelf/ })).toBeInTheDocument();
});

it("shows the new kind's failed lookup and retries into only its rows", async () => {
  const figure = { ...item, id: 32, category: "FIGURE" as const, title: "Figure Shelf" };
  api.searchCollectionsApi.mockImplementation(({ category }: { category: string }) => category === "FIGURE"
    ? Promise.reject(new Error("피규어 조회 실패")) : Promise.resolve([item]));
  render(<CollectionShell />);
  fireEvent.click(screen.getByRole("button", { name: "도서" }));
  expect(await screen.findByRole("button", { name: /Architecture Notes/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "피규어" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("피규어 조회 실패");
  expect(screen.queryByRole("button", { name: /Architecture Notes/ })).not.toBeInTheDocument();
  api.searchCollectionsApi.mockResolvedValue([figure]);
  fireEvent.click(screen.getByRole("button", { name: "목록 다시 조회" }));
  expect(await screen.findByRole("button", { name: /Figure Shelf/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Architecture Notes/ })).not.toBeInTheDocument();
});

it("keeps the last kind when earlier lookups finish out of order", async () => {
  const figure = { ...item, id: 32, category: "FIGURE" as const, title: "Figure Shelf" };
  const card = { ...item, id: 33, category: "CARD" as const, title: "Card Album" };
  let finishFigure: (items: CollectionInfo[]) => void = () => {};
  let finishCard: (items: CollectionInfo[]) => void = () => {};
  api.searchCollectionsApi.mockImplementation(({ category }: { category: string }) => category === "FIGURE"
    ? new Promise<CollectionInfo[]>((resolve) => { finishFigure = resolve; })
    : category === "CARD" ? new Promise<CollectionInfo[]>((resolve) => { finishCard = resolve; }) : Promise.resolve([item]));
  render(<CollectionShell />);
  fireEvent.click(screen.getByRole("button", { name: "도서" }));
  expect(await screen.findByRole("button", { name: /Architecture Notes/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "피규어" }));
  fireEvent.click(screen.getByRole("button", { name: "카드" }));
  await act(async () => { finishCard([card]); finishFigure([figure]); });
  expect(screen.getByRole("button", { name: /Card Album/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Figure Shelf|Architecture Notes/ })).not.toBeInTheDocument();
});

it("double tap opens the same list slot with a fixed category and cancel restores it", async () => {
  render(<CollectionShell />);
  const category = screen.getByRole("button", { name: "도서" });
  fireEvent.click(category, { detail: 1 });
  fireEvent.click(category, { detail: 2 });
  const form = await screen.findByRole("button", { name: "수집 기록 저장" });
  expect(form.closest("[data-create-form]")?.closest("[data-stage-key]")?.getAttribute("data-stage-key")).toBe("lifelog-collection-list");
  expect(screen.getByText("수집 종류: 도서")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "수집 목록으로" }));
  expect(screen.queryByRole("button", { name: "수집 기록 저장" })).not.toBeInTheDocument();
  expect(api.createCollectionApi).not.toHaveBeenCalled();
});

it("failed save keeps input, then successful retry returns to the same kind list", async () => {
  api.createCollectionApi.mockRejectedValueOnce(new Error("저장 실패"));
  render(<CollectionShell />);
  const category = screen.getByRole("button", { name: "도서" });
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), { target: { value: "내 책" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "수량" }), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("저장 실패");
  expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue("내 책");
  fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: "수집 기록 저장" })).not.toBeInTheDocument());
  expect(api.createCollectionApi).toHaveBeenCalledWith(expect.objectContaining({ category: "BOOK", title: "내 책", quantity: 2 }));
  expect(screen.getByRole("heading", { name: "도서 목록" })).toBeInTheDocument();
});

it("cancels deletion without a command and accepts a bodyless delete response", async () => {
  api.searchCollectionsApi.mockResolvedValueOnce([item]).mockResolvedValueOnce([]);
  render(<CollectionShell />);
  fireEvent.click(screen.getByRole("button", { name: "도서" }));
  fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes/ }));
  expect(await screen.findByText("수집 기록 #31")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: /Architecture Notes/ }), { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await answerDialog(false);
  expect(api.deleteCollectionApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
  await answerDialog();
  await waitFor(() => expect(api.deleteCollectionApi).toHaveBeenCalledWith(item.id));
  await waitFor(() => expect(screen.queryByRole("button", { name: /Architecture Notes/ })).not.toBeInTheDocument());
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("does not restore detail or focus after returning during its lookup", async () => {
  let finishDetail: (value: CollectionInfo) => void = () => {};
  api.getCollectionApi.mockImplementationOnce(() => new Promise((resolve) => { finishDetail = resolve; }));
  const focus = vi.fn();
  window.addEventListener(STAGE_FOCUS_EVENT, focus);
  try {
    render(<CollectionShell />);
    fireEvent.click(screen.getByRole("button", { name: "도서" }));
    fireEvent.click(await screen.findByRole("button", { name: /Architecture Notes/ }));
    expect(screen.getByText("수집 기록을 불러오는 중…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수집 기록 목록으로" }));
    expect(focus.mock.lastCall?.[0].detail).toEqual({ key: "lifelog-collection-list", align: "back" });
    const calls = focus.mock.calls.length;
    await act(async () => { finishDetail(item); });
    expect(screen.queryByText("수집 기록 #31")).not.toBeInTheDocument();
    expect(focus).toHaveBeenCalledTimes(calls);
  } finally {
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  }
});

it("keeps a new draft open when an old save finishes after returning to kinds", async () => {
  let finishSave: (value: { id: number }) => void = () => {};
  api.createCollectionApi.mockImplementationOnce(() => new Promise((resolve) => { finishSave = resolve; }));
  render(<CollectionShell />);
  fireEvent.keyDown(screen.getByRole("button", { name: "도서" }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), { target: { value: "Old draft" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "수량" }), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));
  fireEvent.click(screen.getByRole("button", { name: "수집 목록으로" }));
  fireEvent.click(screen.getByRole("button", { name: "수집 종류로" }));
  fireEvent.keyDown(screen.getByRole("button", { name: "피규어" }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), { target: { value: "New draft" } });
  await act(async () => { finishSave({ id: 99 }); });
  expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue("New draft");
  expect(screen.getByRole("button", { name: "수집 기록 저장" })).toBeEnabled();
  expect(screen.queryByText("수집 기록을 저장했습니다.")).not.toBeInTheDocument();
  expect(api.createCollectionApi).toHaveBeenCalledTimes(1);
});

it("sends the weekly reflection subtype and scope in the create request", async () => {
  render(<CollectionShell />);
  fireEvent.keyDown(screen.getByRole("button", { name: "도서" }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByRole("textbox", { name: "제목" }), { target: { value: "Weekly notes" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "수량" }), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "주간 회고" }));
  fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));
  await waitFor(() => expect(api.createCollectionApi).toHaveBeenCalledWith({
    category: "BOOK", title: "Weekly notes", quantity: 1,
    lifeLogSubtype: "REFLECTION", reflectionScope: "WEEKLY_LOOKBACK",
  }));
});

it("record row opens detail and Shift+F10 exposes edit without an always visible menu", async () => {
  render(<CollectionShell />);
  fireEvent.keyDown(screen.getByRole("button", { name: "도서" }), { key: "Enter", altKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수집 목록으로" }));
  const row = await screen.findByRole("button", { name: /Architecture Notes/ });
  expect(screen.queryByText("⋯")).not.toBeInTheDocument();
  fireEvent.click(row);
  expect(await screen.findByText("수집 기록 #31")).toBeInTheDocument();
  fireEvent.keyDown(row, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  expect(await screen.findByRole("heading", { name: "수집 기록 수정" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("spinbutton", { name: "변경할 수량" }), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "수집 기록 저장" }));
  await waitFor(() => expect(api.updateCollectionApi).toHaveBeenCalledWith(31, expect.objectContaining({ quantity: 2 })));
});
