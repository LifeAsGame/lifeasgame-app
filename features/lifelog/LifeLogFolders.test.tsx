import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import LifeLogFolders from "./LifeLogFolders";
import RecordFolderSelect from "./RecordFolderSelect";
import type { LifeLogFolder } from "./personalCategories";

const api = vi.hoisted(() => ({
  getMyLifeLogCategories: vi.fn(), getSystemLifeLogCategories: vi.fn(), addSystemLifeLogCategory: vi.fn(),
  hideSystemLifeLogCategory: vi.fn(), createPersonalLifeLogCategory: vi.fn(), renamePersonalLifeLogCategory: vi.fn(),
  deletePersonalLifeLogCategory: vi.fn(), assignLifeLogRecordCategory: vi.fn(),
}));
vi.mock("./personalCategories", () => api);

let folders: LifeLogFolder[];
beforeEach(() => {
  vi.clearAllMocks();
  folders = [];
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  api.getMyLifeLogCategories.mockImplementation(async () => folders);
  api.getSystemLifeLogCategories.mockResolvedValue([{ code: "PROJECT", name: "PROJECT" }, { code: "OTHER", name: "OTHER" }]);
  api.addSystemLifeLogCategory.mockImplementation(async () => { folders = [{ id: 7, kind: "COLLECTION", source: "SYSTEM", systemCode: "PROJECT", name: "PROJECT" }]; });
  api.createPersonalLifeLogCategory.mockImplementation(async () => { folders = [{ id: 8, kind: "COLLECTION", source: "PERSONAL", systemCode: null, name: "나의 기록" }]; });
  api.assignLifeLogRecordCategory.mockResolvedValue({});
});

it("starts empty, adds a public category once, and opens the selected folder", async () => {
  const onSelect = vi.fn();
  render(<LifeLogFolders kind="COLLECTION" title="수집 기록" stageKey="lifelog-collection-categories" selected={null} onSelect={onSelect} onCreateRecord={vi.fn()} />);
  expect(await screen.findByText(/내 분류가 없습니다/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "프로젝트" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "전체 분류 보기" }));
  fireEvent.click(await screen.findByRole("button", { name: "프로젝트" }));
  fireEvent.click(screen.getByRole("button", { name: "내 분류에 추가" }));
  await waitFor(() => expect(api.addSystemLifeLogCategory).toHaveBeenCalledWith("COLLECTION", "PROJECT"));
  await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ type: "system", code: "PROJECT", name: "PROJECT" }));
});

it("creates a personal folder from the entry gesture and assigns the original record ID", async () => {
  render(<LifeLogFolders kind="COLLECTION" title="수집 기록" stageKey="lifelog-collection-categories" selected={null} createRequest={1} onSelect={vi.fn()} onCreateRecord={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "분류 이름" }), { target: { value: "나의 기록" } });
  fireEvent.click(screen.getByRole("button", { name: "분류 저장" }));
  await waitFor(() => expect(api.createPersonalLifeLogCategory).toHaveBeenCalledWith("COLLECTION", "나의 기록"));
  expect(await screen.findByRole("button", { name: /나의 기록/ })).toBeInTheDocument();

  const onSaved = vi.fn();
  folders = [{ id: 9, kind: "EXERCISE", source: "PERSONAL", systemCode: null, name: "운동 메모" }];
  render(<RecordFolderSelect kind="EXERCISE" recordId={41} categoryId={null} onSaved={onSaved} />);
  const select = await screen.findByRole("combobox", { name: "기록의 내 분류" });
  await waitFor(() => expect(select).toHaveTextContent("운동 메모"));
  fireEvent.change(select, { target: { value: "9" } });
  fireEvent.click(screen.getByRole("button", { name: "내 분류 변경" }));
  await waitFor(() => expect(api.assignLifeLogRecordCategory).toHaveBeenCalledWith("EXERCISE", 41, 9));
  expect(onSaved).toHaveBeenCalled();
});

it("does not repeat a saved assignment when refreshing the record fails", async () => {
  folders = [{ id: 9, kind: "EXERCISE", source: "PERSONAL", systemCode: null, name: "운동 메모" }];
  render(<RecordFolderSelect kind="EXERCISE" recordId={41} categoryId={null} onSaved={async () => false} />);
  const select = await screen.findByRole("combobox", { name: "기록의 내 분류" });
  await waitFor(() => expect(select).toHaveTextContent("운동 메모"));
  fireEvent.change(select, { target: { value: "9" } });
  fireEvent.click(screen.getByRole("button", { name: "내 분류 변경" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("분류 연결은 저장됐지만");
  expect(screen.getByRole("button", { name: "내 분류 변경" })).toBeDisabled();
  expect(api.assignLifeLogRecordCategory).toHaveBeenCalledTimes(1);
});
