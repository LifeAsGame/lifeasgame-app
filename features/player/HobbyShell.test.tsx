import { answerDialog } from "@/shared/ui/dialogTest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import HobbyShell from "./HobbyShell";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
const personal = vi.hoisted(() => ({ listPersonalCategoriesApi: vi.fn(), createPersonalCategoryApi: vi.fn(), renamePersonalCategoryApi: vi.fn(), deletePersonalCategoryApi: vi.fn(), assignPersonalCategoryApi: vi.fn() }));
const privateApi = vi.hoisted(() => ({ getOwnedCategoriesApi: vi.fn(), getPrivateHobbiesApi: vi.fn(), createPrivateHobbyApi: vi.fn(), updatePrivateHobbyApi: vi.fn(), deletePrivateHobbyApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("./personalCategories", async (importOriginal) => ({ ...await importOriginal<typeof import("./personalCategories")>(), ...personal }));
vi.mock("./catalog", async (importOriginal) => ({ ...await importOriginal<typeof import("./catalog")>(), ...privateApi }));
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
  privateApi.getOwnedCategoriesApi.mockResolvedValue([systems.find((item) => item.code === "ARTS")]);
  privateApi.getPrivateHobbiesApi.mockResolvedValue([]);
  personal.listPersonalCategoriesApi.mockResolvedValue([...systems, folder]);
  personal.createPersonalCategoryApi.mockResolvedValue(folder);
  personal.renamePersonalCategoryApi.mockResolvedValue(folder);
  personal.deletePersonalCategoryApi.mockResolvedValue(undefined);
  personal.assignPersonalCategoryApi.mockResolvedValue({ itemId: 1, personalCategoryId: 7 });
});

it("보유한 기본 분류만 표시하고 빈 개인 분류를 유지한다", async () => {
  api.getHobbyCatalogApi.mockResolvedValue([]);
  api.getPlayerHobbiesApi.mockResolvedValue([]);
  privateApi.getOwnedCategoriesApi.mockResolvedValue([]);
  render(<HobbyShell />);
  await screen.findByRole("button", { name: /Weekend/ });
  expect(document.querySelectorAll('[data-stage-key="player-hobby-categories"] .lag-role-node')).toHaveLength(2);
  expect(screen.getByRole("button", { name: /전체 취미 보기/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Weekend/ }), { detail: 0 });
  expect(screen.getByText("해당 분류의 취미가 없습니다.")).toBeInTheDocument();
});

it("POST 성공 뒤 재조회 실패 시 취미를 중복 등록하지 않는다", async () => {
  let current = [owned];
  let failNextRead = false;
  api.getPlayerHobbiesApi.mockImplementation(async () => {
    if (failNextRead) { failNextRead = false; throw new Error("일시적 조회 실패"); }
    return current;
  });
  api.registerPlayerHobbyApi.mockImplementation(async () => {
    current = [...current, { ...catalog[1], customName: "Chess club", detail: null, proficiency: 10, status: "ACTIVE", startedOn: null, xp: 0, personalCategoryId: null }];
    failNextRead = true;
    return { hobbyId: 2 };
  });
  render(<HobbyShell />);
  fireEvent.keyDown(await screen.findByRole("button", { name: /Weekend/ }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByRole("combobox", { name: "취미" }), { target: { value: "2" } });
  fireEvent.change(screen.getByRole("textbox", { name: "취미 이름" }), { target: { value: "Chess club" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "숙련도" }), { target: { value: "10" } });
  fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
  await screen.findByText(/취미 변경 후 목록을 다시 조회하지 못했습니다/);
  fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
  await waitFor(() => expect(personal.assignPersonalCategoryApi).toHaveBeenCalledWith("HOBBY", 2, 7));
  expect(api.registerPlayerHobbyApi).toHaveBeenCalledTimes(1);
});

it("상위 더블클릭은 비공개 취미 생성, 별도 동작은 개인 분류 생성이다", async () => {
  render(<HobbyShell createRequest={1} />);
  expect(await screen.findByRole("textbox", { name: "취미 이름" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "취미 분류로" }));
  fireEvent.click(screen.getByRole("button", { name: "내 분류 만들기" }));
  expect(screen.getByRole("textbox", { name: "분류 이름" })).toBeInTheDocument();
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

it("개인 취미는 이름으로 보유 행을 만들고 공개 카탈로그에 추가하지 않는다", async () => {
  const privateHobby = { ownedItemId: 90, catalogItemId: null, source: "PRIVATE", name: "Miniature painting", detail: "Only me", proficiency: 12, status: "ACTIVE", startedOn: null, personalCategoryId: 7 };
  privateApi.createPrivateHobbyApi.mockResolvedValue(privateHobby);
  privateApi.getPrivateHobbiesApi.mockResolvedValueOnce([]).mockResolvedValue([privateHobby]);
  render(<HobbyShell createRequest={1} />);
  fireEvent.change(await screen.findByRole("textbox", { name: "취미 이름" }), { target: { value: " Miniature painting " } });
  fireEvent.change(screen.getByRole("textbox", { name: "설명" }), { target: { value: "Only me" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "숙련도" }), { target: { value: "12" } });
  fireEvent.change(screen.getByRole("combobox", { name: "내 분류" }), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "내 취미 저장" }));
  await waitFor(() => expect(privateApi.createPrivateHobbyApi).toHaveBeenCalledWith(expect.objectContaining({ name: "Miniature painting", detail: "Only me", proficiency: 12, personalCategoryId: 7 })));
  expect(api.registerPlayerHobbyApi).not.toHaveBeenCalled();
  expect(await screen.findByRole("button", { name: /Miniature painting/ })).toBeInTheDocument();
});

it("개인 취미 저장 실패 후 입력을 보존하고 정상 재시도한다", async () => {
  const privateHobby = { ownedItemId: 90, catalogItemId: null, source: "PRIVATE", name: "Chess at home", detail: null, proficiency: 0, status: "ACTIVE", startedOn: null, personalCategoryId: null };
  privateApi.createPrivateHobbyApi.mockRejectedValueOnce(new Error("일시적 저장 실패")).mockResolvedValue(privateHobby);
  privateApi.getPrivateHobbiesApi.mockResolvedValueOnce([]).mockResolvedValue([privateHobby]);
  render(<HobbyShell createRequest={1} />);
  const input = await screen.findByRole("textbox", { name: "취미 이름" });
  fireEvent.change(input, { target: { value: "Chess at home" } });
  fireEvent.click(screen.getByRole("button", { name: "내 취미 저장" }));
  expect(await screen.findByText("일시적 저장 실패")).toBeInTheDocument();
  expect(input).toHaveValue("Chess at home");
  expect(privateApi.createPrivateHobbyApi).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "내 취미 저장" }));
  expect(await screen.findByRole("button", { name: /Chess at home/ })).toBeInTheDocument();
  expect(privateApi.createPrivateHobbyApi).toHaveBeenCalledTimes(2);
});

it("개인 취미 수정과 삭제는 ownedItemId 전용 경로만 사용한다", async () => {
  const privateHobby = { ownedItemId: 90, catalogItemId: null, source: "PRIVATE", name: "Miniature painting", detail: null, proficiency: 12, status: "ACTIVE", startedOn: null, personalCategoryId: 7 };
  const updated = { ...privateHobby, name: "Model painting", proficiency: 20 };
  privateApi.getPrivateHobbiesApi.mockResolvedValueOnce([privateHobby]).mockResolvedValueOnce([updated]).mockResolvedValue([]);
  privateApi.updatePrivateHobbyApi.mockResolvedValue(updated);
  render(<HobbyShell />);
  fireEvent.click(await screen.findByRole("button", { name: /Weekend/ }), { detail: 0 });
  fireEvent.click(await screen.findByRole("button", { name: /Miniature painting/ }), { detail: 0 });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "취미 이름" }), { target: { value: "Model painting" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "숙련도" }), { target: { value: "20" } });
  fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
  await waitFor(() => expect(privateApi.updatePrivateHobbyApi).toHaveBeenCalledWith(90, expect.objectContaining({ name: "Model painting", proficiency: 20, personalCategoryId: 7 })));
  fireEvent.click(await screen.findByRole("button", { name: "삭제" }));
  await answerDialog();
  await waitFor(() => expect(privateApi.deletePrivateHobbyApi).toHaveBeenCalledWith(90));
  expect(api.deletePlayerHobbyApi).not.toHaveBeenCalled();
});
