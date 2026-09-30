import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import HobbyShell from "./HobbyShell";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, onClick, onAction }: { label: string; onClick: () => void; onAction: (type: string) => void }) => <div><button onClick={onClick}>{label}</button><button onClick={() => onAction("edit")}>수정</button><button onClick={() => onAction("delete")}>삭제</button></div> }));
const catalog: HobbyCatalogInfo[] = [{ hobbyId: 1, name: "Reading", category: "Learning" }, { hobbyId: 2, name: "Running", category: "Fitness" }];
const owned: PlayerHobbyInfo = { ...catalog[0], customName: "Books", detail: null, proficiency: 40, status: "PAUSED", startedOn: null, xp: 100 };
const choose = (name: string) => fireEvent.click(screen.getByRole("button", { name }), { detail: 0 });
const create = (name: string) => fireEvent.keyDown(screen.getByRole("button", { name }), { key: "Enter", altKey: true });

beforeEach(() => { vi.clearAllMocks(); api.getHobbyCatalogApi.mockResolvedValue(catalog); api.getPlayerHobbiesApi.mockResolvedValue([owned]); });

it("uses catalog categories as a parent stage and clears the old detail on type changes", async () => {
  render(<HobbyShell />);
  expect(await screen.findByRole("button", { name: "Learning" })).toBeInTheDocument();
  expect(document.querySelector('[data-stage-key="player-hobby-list"]')).not.toBeInTheDocument();
  choose("Learning");
  const parent = document.querySelector('[data-stage-key="player-hobby-categories"] .lag-panel-frame');
  fireEvent.click(screen.getByRole("button", { name: "Books" }));
  expect(document.querySelector('[data-stage-key="player-hobby-detail"]')).toBeInTheDocument();
  choose("운동");
  expect(document.querySelector('[data-stage-key="player-hobby-categories"] .lag-panel-frame')).toBe(parent);
  await waitFor(() => expect(document.querySelector('[data-stage-key="player-hobby-detail"]')).not.toBeInTheDocument());
  expect(screen.getByText("해당 분류의 취미가 없습니다.")).toBeInTheDocument();
  choose("Learning");
  expect(within(document.querySelector('[data-stage-key="player-hobby-list"]') as HTMLElement).getByRole("button", { name: "Books" })).toBeInTheDocument();
  expect(document.querySelector('[data-stage-key="player-hobby-detail"]')).not.toBeInTheDocument();
});

it("opens registration in the selected category slot, removes duplicate Cancel, and Back discards the draft", async () => {
  render(<HobbyShell />); await screen.findByRole("button", { name: "운동" }); create("운동");
  expect(Array.from((screen.getByLabelText("취미") as HTMLSelectElement).options, (option) => option.text)).toEqual(["선택…", "Running · 운동"]);
  expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("취미 이름"), { target: { value: "Evening run" } });
  fireEvent.click(screen.getByRole("button", { name: "취미 목록으로" }));
  expect(api.registerPlayerHobbyApi).not.toHaveBeenCalled();
  create("운동");
  expect(screen.getByLabelText("취미 이름")).toHaveValue("");
});

it("retains failed input and registers only the selected catalog hobby after retry", async () => {
  api.registerPlayerHobbyApi.mockRejectedValueOnce(new Error("등록 실패")).mockResolvedValue({ hobbyId: 2 });
  render(<HobbyShell />); await screen.findByRole("button", { name: "운동" }); create("운동");
  fireEvent.change(screen.getByLabelText("취미"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("취미 이름"), { target: { value: "Evening run" } });
  fireEvent.change(screen.getByLabelText("숙련도"), { target: { value: "35" } });
  fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("등록 실패");
  expect(screen.getByLabelText("취미 이름")).toHaveValue("Evening run");
  api.getPlayerHobbiesApi.mockResolvedValue([owned, { ...catalog[1], customName: "Evening run", detail: null, proficiency: 35, status: "ACTIVE", startedOn: null, xp: 0 }]);
  fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
  await waitFor(() => expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument());
  expect(api.registerPlayerHobbyApi).toHaveBeenLastCalledWith(2, { customName: "Evening run", proficiency: 35, status: "ACTIVE" });
});
