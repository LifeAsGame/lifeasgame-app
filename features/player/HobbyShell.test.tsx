import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import HobbyShell from "./HobbyShell";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
const personal = vi.hoisted(() => ({ listPersonalCategoriesApi: vi.fn(), createPersonalCategoryApi: vi.fn(), renamePersonalCategoryApi: vi.fn(), deletePersonalCategoryApi: vi.fn(), assignPersonalCategoryApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("./personalCategories", async (importOriginal) => ({ ...await importOriginal<typeof import("./personalCategories")>(), ...personal }));
const catalog: HobbyCatalogInfo[] = [{ hobbyId: 1, name: "Painting", category: "ARTS" }, { hobbyId: 2, name: "Chess", category: "BOARD_GAMES" }];
const owned: PlayerHobbyInfo = { ...catalog[0], customName: "Watercolor", detail: null, proficiency: 30, status: "ACTIVE", startedOn: null, xp: 0, personalCategoryId: null };
const systems = ["FITNESS", "SPORTS", "OUTDOORS", "MUSIC", "ARTS", "CRAFTS", "GAMING", "BOARD_GAMES", "TECH", "COOKING", "BAKING", "PHOTOGRAPHY", "READING", "WRITING", "LANGUAGE", "TRAVEL", "WELLNESS", "VOLUNTEERING"].map((code) => ({ id: null, code, name: code, source: "SYSTEM", kind: "HOBBY" }));
const folder = { id: 7, code: null, name: "Weekend", source: "PERSONAL", kind: "HOBBY" };
beforeEach(() => {
  vi.clearAllMocks();
  api.getHobbyCatalogApi.mockResolvedValue(catalog);
  api.getPlayerHobbiesApi.mockResolvedValue([owned]);
  api.registerPlayerHobbyApi.mockResolvedValue({ hobbyId: 2 });
  api.updatePlayerHobbyApi.mockResolvedValue(owned);
  personal.listPersonalCategoriesApi.mockResolvedValue([...systems, folder]);
  personal.createPersonalCategoryApi.mockResolvedValue(folder);
  personal.renamePersonalCategoryApi.mockResolvedValue(folder);
  personal.deletePersonalCategoryApi.mockResolvedValue(undefined);
  personal.assignPersonalCategoryApi.mockResolvedValue({ itemId: 1, personalCategoryId: 7 });
});

it("카탈로그가 비어도 기본 18개와 빈 개인 분류를 표시한다", async () => {
  api.getHobbyCatalogApi.mockResolvedValue([]);
  api.getPlayerHobbiesApi.mockResolvedValue([]);
  render(<HobbyShell />);
  await screen.findByRole("button", { name: /Weekend/ });
  expect(document.querySelectorAll('[data-stage-key="player-hobby-categories"] .lag-role-node')).toHaveLength(19);
  fireEvent.click(screen.getByRole("button", { name: /Weekend/ }), { detail: 0 });
  expect(screen.getByText("해당 분류의 취미가 없습니다.")).toBeInTheDocument();
});

it("상위 더블클릭은 개인 분류 생성, 분류 더블클릭은 항목 등록이다", async () => {
  render(<HobbyShell createRequest={1} />);
  expect(await screen.findByRole("textbox", { name: "분류 이름" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "분류 목록으로" }));
  const category = screen.getByRole("button", { name: /Weekend/ });
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  expect(screen.getByRole("button", { name: "취미 저장" })).toBeInTheDocument();
  expect(Array.from((screen.getByRole("combobox", { name: "취미" }) as HTMLSelectElement).options).map((option) => option.text)).toContain("Chess · 보드게임");
});

it("기존 취미를 내 분류에 배정하고 해제한다", async () => {
  let current = [owned];
  api.getPlayerHobbiesApi.mockImplementation(async () => current);
  personal.assignPersonalCategoryApi.mockImplementation(async (_kind: string, _id: number, categoryId: number | null) => { current = [{ ...owned, personalCategoryId: categoryId }]; return { itemId: 1, personalCategoryId: categoryId }; });
  render(<HobbyShell />);
  fireEvent.click(await screen.findByRole("button", { name: "미술" }), { detail: 0 });
  fireEvent.click(screen.getByRole("button", { name: /Watercolor/ }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Watercolor/ }), { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByRole("combobox", { name: "내 분류" }), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
  await waitFor(() => expect(personal.assignPersonalCategoryApi).toHaveBeenCalledWith("HOBBY", 1, 7));
  fireEvent.click(screen.getByRole("button", { name: /Weekend/ }), { detail: 0 });
  fireEvent.click(screen.getByRole("button", { name: /Watercolor/ }));
  fireEvent.keyDown(screen.getByRole("button", { name: /Watercolor/ }), { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByRole("combobox", { name: "내 분류" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
  await waitFor(() => expect(personal.assignPersonalCategoryApi).toHaveBeenLastCalledWith("HOBBY", 1, null));
});
