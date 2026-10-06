import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import CatalogExplorer from "./CatalogExplorer";

const catalog = vi.hoisted(() => ({ getCatalogGroupsApi: vi.fn(), getCatalogItemsApi: vi.fn(), getCatalogItemApi: vi.fn() }));
vi.mock("./catalog", async (importOriginal) => ({ ...await importOriginal<typeof import("./catalog")>(), ...catalog }));

const item = {
  catalogItemId: 42, name: "Qualified craft", category: "OTHER", source: "HRDK", sourceCode: "Q42",
  majorCode: "M1", majorName: "Craft", minorCode: "S1", minorName: "Material", issuer: null,
  administeringAgency: "Verified agency", detail: "Plain information", detailStatus: "BASIC",
  sourceUrl: "https://example.org/item", fetchedAt: "2026-10-05T00:00:00Z", owned: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  catalog.getCatalogGroupsApi.mockResolvedValue([{ majorCode: "M1", majorName: "Craft", minorCode: "S1", minorName: "Material", source: "HRDK" }]);
  catalog.getCatalogItemsApi.mockResolvedValue({ items: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  catalog.getCatalogItemApi.mockResolvedValue(item);
});

it("공식 대·소분류, 상세, 저장 시에만 보유 등록을 연결한다", async () => {
  const onRegister = vi.fn().mockResolvedValue(true);
  render(<CatalogExplorer kind="CERTIFICATION" categories={[{ id: 7, code: null, name: "Study", source: "PERSONAL", kind: "CERTIFICATION" }]} onClose={vi.fn()} onRegister={onRegister} onOwned={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "Craft" }));
  fireEvent.click(await screen.findByRole("button", { name: "Material" }));
  await waitFor(() => expect(catalog.getCatalogItemsApi).toHaveBeenCalledWith("CERTIFICATION", expect.objectContaining({ majorCode: "M1", minorCode: "S1", page: 0 })));
  const list = document.querySelector('[data-stage-key="player-certification-catalog-items"]') as HTMLElement;
  fireEvent.keyDown(within(list).getByRole("button", { name: /Qualified craft/ }), { key: "Enter", altKey: true });
  expect(onRegister).not.toHaveBeenCalled();
  expect(await screen.findByRole("button", { name: "자격증 저장" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "상세로" }));
  expect(await screen.findByText("Plain information")).toBeInTheDocument();
  expect(screen.getAllByText("Verified agency")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "내 자격증 등록" }));
  fireEvent.change(screen.getByRole("combobox", { name: "내 분류" }), { target: { value: "7" } });
  fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
  await waitFor(() => expect(onRegister).toHaveBeenCalledWith(42, expect.any(FormData), 7));
});

it("검색은 이름 질의를 보내고 이미 보유한 항목은 다시 등록하지 않는다", async () => {
  const ownedItem = { ...item, owned: true, ownedItemId: 99 };
  catalog.getCatalogItemsApi.mockResolvedValue({ items: [ownedItem], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  const onOwned = vi.fn();
  const onRegister = vi.fn();
  render(<CatalogExplorer kind="CERTIFICATION" categories={[]} onClose={vi.fn()} onRegister={onRegister} onOwned={onOwned} />);
  fireEvent.change(screen.getByRole("textbox", { name: "자격증 검색" }), { target: { value: " craft " } });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  await waitFor(() => expect(catalog.getCatalogItemsApi).toHaveBeenCalledWith("CERTIFICATION", expect.objectContaining({ q: "craft", page: 0 })));
  const list = document.querySelector('[data-stage-key="player-certification-catalog-items"]') as HTMLElement;
  fireEvent.keyDown(await within(list).findByRole("button", { name: /Qualified craft/ }), { key: "Enter", altKey: true });
  expect(onOwned).toHaveBeenCalledWith(ownedItem);
  expect(onRegister).not.toHaveBeenCalled();
});
