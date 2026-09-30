import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { CollectionInfo } from "@/shared/api/types";
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

it("double tap opens the same list slot with a fixed category and cancel restores it", async () => {
  render(<CollectionShell />);
  const category = screen.getByRole("button", { name: "도서" });
  fireEvent.click(category, { detail: 1 });
  fireEvent.click(category, { detail: 2 });
  const form = await screen.findByRole("button", { name: "수집 기록 저장" });
  expect(form.closest("[data-create-form]")?.closest("[data-stage-key]")?.getAttribute("data-stage-key")).toBe("lifelog-collection-list");
  expect(screen.getByText("수집 종류: 도서")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
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

it("record row opens detail and Shift+F10 exposes edit without an always visible menu", async () => {
  render(<CollectionShell />);
  fireEvent.keyDown(screen.getByRole("button", { name: "도서" }), { key: "Enter", altKey: true });
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
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
