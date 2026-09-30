import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { CertificationCatalogInfo, PlayerCertificationInfo } from "@/shared/api/types";
import CertificationShell from "./CertificationShell";

const api = vi.hoisted(() => ({
  deletePlayerCertificationApi: vi.fn(), getCertificationCatalogApi: vi.fn(), getPlayerCertificationsApi: vi.fn(),
  registerPlayerCertificationApi: vi.fn(), updatePlayerCertificationApi: vi.fn(),
}));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, onClick, onAction }: { label: string; onClick: () => void; onAction: (type: string) => void }) => <div><button onClick={onClick}>{label}</button><button onClick={() => onAction("edit")}>수정</button><button onClick={() => onAction("delete")}>삭제</button></div> }));
const catalog: CertificationCatalogInfo[] = [
  { certificationId: 1, name: "AWS", issuer: "Amazon", category: "Cloud" },
  { certificationId: 2, name: "Kubernetes", issuer: "CNCF", category: "DevOps" },
];
const owned: PlayerCertificationInfo = { ...catalog[0], acquiredDate: null, expiresDate: null, grantedAt: "2026-09-01T00:00:00Z" };
const category = (name: string) => screen.getByRole("button", { name });
const choose = (name: string) => fireEvent.click(category(name), { detail: 0 });
const create = (name: string) => fireEvent.keyDown(category(name), { key: "Enter", altKey: true });

beforeEach(() => {
  vi.clearAllMocks(); api.getCertificationCatalogApi.mockResolvedValue(catalog); api.getPlayerCertificationsApi.mockResolvedValue([owned]);
  api.registerPlayerCertificationApi.mockResolvedValue({ certificationId: 2 }); api.updatePlayerCertificationApi.mockResolvedValue({ certificationId: 1 });
});

it("keeps category and list in separate slots, resets detail on type reentry, and never creates from the top menu", async () => {
  render(<CertificationShell />);
  expect(await screen.findByRole("button", { name: "클라우드" })).toBeInTheDocument();
  expect(document.querySelector('[data-stage-key="player-certification-list"]')).not.toBeInTheDocument();
  choose("클라우드");
  const categoryFrame = document.querySelector('[data-stage-key="player-certification-categories"] .lag-panel-frame');
  expect(within(document.querySelector('[data-stage-key="player-certification-list"]') as HTMLElement).getByRole("button", { name: "AWS" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "AWS" }));
  expect(document.querySelector('[data-stage-key="player-certification-detail"]')).toBeInTheDocument();
  choose("DevOps");
  expect(document.querySelector('[data-stage-key="player-certification-categories"] .lag-panel-frame')).toBe(categoryFrame);
  await waitFor(() => expect(document.querySelector('[data-stage-key="player-certification-detail"]')).not.toBeInTheDocument());
  expect(screen.getByText("해당 분류의 자격증이 없습니다.")).toBeInTheDocument();
  choose("클라우드");
  await waitFor(() => expect(document.querySelector('[data-stage-key="player-certification-detail"]')).not.toBeInTheDocument());
});

it("opens creation in the selected type list slot and returns with Back without a write", async () => {
  render(<CertificationShell />);
  await screen.findByRole("button", { name: "DevOps" });
  create("DevOps");
  const list = document.querySelector('[data-stage-key="player-certification-list"]');
  expect(within(list as HTMLElement).getByRole("button", { name: "자격증 저장" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "취소" })).not.toBeInTheDocument();
  expect(Array.from((screen.getByLabelText("자격증") as HTMLSelectElement).options, (option) => option.text)).toEqual(["선택…", "Kubernetes · CNCF"]);
  fireEvent.change(screen.getByLabelText("취득일"), { target: { value: "2026-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "자격증 목록으로" }));
  expect(api.registerPlayerCertificationApi).not.toHaveBeenCalled();
  expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
  create("DevOps");
  expect(screen.getByLabelText("취득일")).toHaveValue("");
});

it("preserves a failed creation draft, then registers only a catalog item in the chosen type", async () => {
  api.registerPlayerCertificationApi.mockRejectedValueOnce(new Error("등록 실패"));
  render(<CertificationShell />); await screen.findByRole("button", { name: "DevOps" }); create("DevOps");
  fireEvent.change(screen.getByLabelText("자격증"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("취득일"), { target: { value: "2026-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("등록 실패");
  expect(screen.getByLabelText("취득일")).toHaveValue("2026-09-01");
  api.getPlayerCertificationsApi.mockResolvedValue([owned, { ...catalog[1], acquiredDate: "2026-09-01", expiresDate: null, grantedAt: "2026-09-01T00:00:00Z" }]);
  fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
  await waitFor(() => expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument());
  expect(api.registerPlayerCertificationApi).toHaveBeenLastCalledWith(2, { acquiredDate: "2026-09-01" });
});

it("keeps the newly selected category when an earlier edit resolves", async () => {
  let finish!: (value: unknown) => void;
  api.updatePlayerCertificationApi.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  render(<CertificationShell />); await screen.findByRole("button", { name: "클라우드" }); choose("클라우드");
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByLabelText("변경할 만료일"), { target: { value: "2027-09-01" } });
  fireEvent.click(screen.getByRole("button", { name: "날짜 저장" }));
  choose("DevOps");
  await act(async () => finish({}));
  expect(screen.getByText("해당 분류의 자격증이 없습니다.")).toBeInTheDocument();
  expect(document.querySelector('[data-stage-key="player-certification-detail"]')).not.toBeInTheDocument();
});
