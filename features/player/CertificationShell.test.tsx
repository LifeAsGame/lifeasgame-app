import { answerDialog } from "@/shared/ui/dialogTest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { CertificationCatalogInfo, PlayerCertificationInfo } from "@/shared/api/types";
import CertificationShell from "./CertificationShell";

const api = vi.hoisted(() => ({
  deletePlayerCertificationApi: vi.fn(), getCertificationCatalogApi: vi.fn(), getPlayerCertificationsApi: vi.fn(),
  registerPlayerCertificationApi: vi.fn(), updatePlayerCertificationApi: vi.fn(),
}));
const personal = vi.hoisted(() => ({ listPersonalCategoriesApi: vi.fn(), createPersonalCategoryApi: vi.fn(), renamePersonalCategoryApi: vi.fn(), deletePersonalCategoryApi: vi.fn(), assignPersonalCategoryApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("./personalCategories", async (importOriginal) => ({ ...await importOriginal<typeof import("./personalCategories")>(), ...personal }));
const catalog: CertificationCatalogInfo[] = [{ certificationId: 1, name: "AWS", issuer: "Amazon", category: "CLOUD" }, { certificationId: 2, name: "Kubernetes", issuer: "CNCF", category: "PROGRAMMING" }];
const owned: PlayerCertificationInfo = { ...catalog[0], acquiredDate: null, expiresDate: null, grantedAt: "2026-09-01T00:00:00Z", personalCategoryId: null };
const systems = ["PROGRAMMING", "CLOUD", "DATABASE", "SECURITY", "DATA", "NETWORK", "LANGUAGE", "MANAGEMENT", "FINANCE", "DESIGN", "OTHER"].map((code) => ({ id: null, code, name: code, source: "SYSTEM", kind: "CERTIFICATION" }));
const folder = { id: 123, code: null, name: "Cloud notes", source: "PERSONAL", kind: "CERTIFICATION" };
beforeEach(() => {
  vi.clearAllMocks();
  api.getCertificationCatalogApi.mockResolvedValue(catalog);
  api.getPlayerCertificationsApi.mockResolvedValue([owned]);
  api.registerPlayerCertificationApi.mockResolvedValue({ certificationId: 2 });
  api.updatePlayerCertificationApi.mockResolvedValue({ certificationId: 1 });
  personal.listPersonalCategoriesApi.mockResolvedValue([...systems, folder]);
  personal.createPersonalCategoryApi.mockResolvedValue(folder);
  personal.renamePersonalCategoryApi.mockResolvedValue(folder);
  personal.deletePersonalCategoryApi.mockResolvedValue(undefined);
  personal.assignPersonalCategoryApi.mockResolvedValue({ itemId: 1, personalCategoryId: 123 });
});

it("기본 11개와 빈 내 분류를 카탈로그 건수와 독립적으로 보여준다", async () => {
  api.getCertificationCatalogApi.mockResolvedValue([]);
  api.getPlayerCertificationsApi.mockResolvedValue([]);
  render(<CertificationShell />);
  await screen.findByRole("button", { name: /Cloud notes/ });
  expect(screen.getByText("기본 분류")).toBeInTheDocument();
  expect(screen.getAllByText("내 분류").length).toBeGreaterThan(0);
  expect(document.querySelectorAll('[data-stage-key="player-certification-categories"] .lag-role-node')).toHaveLength(12);
  fireEvent.click(screen.getByRole("button", { name: /Cloud notes/ }), { detail: 0 });
  expect(screen.getByText("해당 분류의 자격증이 없습니다.")).toBeInTheDocument();
});

it("상위 생성은 내 분류, 분류 더블클릭은 항목 등록으로 진입한다", async () => {
  const view = render(<CertificationShell createRequest={1} />);
  expect(await screen.findByRole("textbox", { name: "분류 이름" })).toBeInTheDocument();
  fireEvent.change(screen.getByRole("textbox", { name: "분류 이름" }), { target: { value: "  Study  " } });
  fireEvent.click(screen.getByRole("button", { name: "분류 저장" }));
  await waitFor(() => expect(personal.createPersonalCategoryApi).toHaveBeenCalledWith("CERTIFICATION", "Study"));
  await waitFor(() => expect(screen.queryByRole("textbox", { name: "분류 이름" })).not.toBeInTheDocument());
  const category = screen.getByRole("button", { name: "클라우드" });
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  expect(screen.getByRole("button", { name: "자격증 저장" })).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "자격증" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "자격증 목록으로" }));
  expect(api.registerPlayerCertificationApi).not.toHaveBeenCalled();
  view.unmount();
});

it("내 분류 등록은 먼저 소유 등록 후 연결하고 연결 실패 재시도는 중복 등록하지 않는다", async () => {
  let current = [owned];
  api.getPlayerCertificationsApi.mockImplementation(async () => current);
  personal.assignPersonalCategoryApi.mockRejectedValueOnce(new Error("연결 실패")).mockImplementation(async () => { current = [...current.slice(0, 1), { ...catalog[1], acquiredDate: null, expiresDate: null, grantedAt: "2026-09-01", personalCategoryId: 123 }]; return { itemId: 2, personalCategoryId: 123 }; });
  api.registerPlayerCertificationApi.mockImplementation(async () => { current = [...current, { ...catalog[1], acquiredDate: null, expiresDate: null, grantedAt: "2026-09-01", personalCategoryId: null }]; return { certificationId: 2 }; });
  render(<CertificationShell />);
  const category = await screen.findByRole("button", { name: /Cloud notes/ });
  fireEvent.keyDown(category, { key: "Enter", altKey: true });
  fireEvent.change(screen.getByRole("combobox", { name: "자격증" }), { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("연결 실패");
  fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
  await waitFor(() => expect(personal.assignPersonalCategoryApi).toHaveBeenCalledTimes(2));
  expect(api.registerPlayerCertificationApi).toHaveBeenCalledTimes(1);
  expect(personal.assignPersonalCategoryApi).toHaveBeenLastCalledWith("CERTIFICATION", 2, 123);
});

it("내 분류 삭제는 소유 항목 삭제와 분리하고 수정에서 연결 해제를 보낸다", async () => {
  api.getPlayerCertificationsApi.mockResolvedValue([{ ...owned, personalCategoryId: 123 }]);
  render(<CertificationShell />);
  const category = await screen.findByRole("button", { name: /Cloud notes/ });
  fireEvent.click(category, { detail: 0 });
  fireEvent.click(screen.getByRole("button", { name: /AWS/ }));
  fireEvent.keyDown(screen.getByRole("button", { name: /AWS/ }), { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByRole("combobox", { name: "내 분류" }), { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "날짜 저장" }));
  await waitFor(() => expect(personal.assignPersonalCategoryApi).toHaveBeenCalledWith("CERTIFICATION", 1, null));
  fireEvent.keyDown(category, { key: "F10", shiftKey: true });
  fireEvent.click(within(category.closest(".lag-role-record-row") as HTMLElement).getByRole("button", { name: "삭제" }));
  expect(screen.getByText(/개인 분류 연결만 해제/)).toBeInTheDocument();
  await answerDialog();
  await waitFor(() => expect(personal.deletePersonalCategoryApi).toHaveBeenCalledWith("CERTIFICATION", 123));
  expect(api.deletePlayerCertificationApi).not.toHaveBeenCalled();
});
