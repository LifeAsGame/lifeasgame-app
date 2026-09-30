import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CertificationCatalogInfo, PlayerCertificationInfo } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import CertificationShell from "./CertificationShell";

const api = vi.hoisted(() => ({
  deletePlayerCertificationApi: vi.fn(),
  getCertificationCatalogApi: vi.fn(),
  getPlayerCertificationsApi: vi.fn(),
  registerPlayerCertificationApi: vi.fn(),
  updatePlayerCertificationApi: vi.fn(),
}));

vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, subtitle, onClick, onAction }: { label: string; subtitle: string; onClick: () => void; onAction: (type: string) => void }) => <div><button type="button" data-testid="certification-entry" onClick={onClick}>{label} · {subtitle}</button><button type="button" onClick={() => onAction("edit")}>수정</button><button type="button" onClick={() => onAction("delete")}>삭제</button></div>,
}));

const catalog: CertificationCatalogInfo[] = [
  { certificationId: 1, name: "AWS", issuer: "Amazon", category: "Cloud" },
  { certificationId: 3, name: "Kubernetes", issuer: "CNCF", category: "DevOps" },
];
const owned: PlayerCertificationInfo = { ...catalog[0], acquiredDate: null, expiresDate: null, grantedAt: "2026-08-01T00:00:00Z" };
const reloaded = { ...owned, expiresDate: "2027-08-01" };
const devopsOwned: PlayerCertificationInfo = { ...catalog[1], acquiredDate: "2026-08-10", expiresDate: null, grantedAt: "2026-08-10T00:00:00Z" };

describe("자격증 management surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getCertificationCatalogApi.mockResolvedValue(catalog);
    api.getPlayerCertificationsApi.mockResolvedValueOnce([owned]).mockResolvedValue([reloaded]);
    api.registerPlayerCertificationApi.mockResolvedValue({ certificationId: 3, acquiredDate: null, expiresDate: null });
    api.updatePlayerCertificationApi.mockResolvedValue({ certificationId: 1, acquiredDate: null, expiresDate: "2027-08-01" });
    api.deletePlayerCertificationApi.mockResolvedValue(1);
  });

  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.getPlayerCertificationsApi.mockReset().mockResolvedValue([]);
    render(<CertificationShell />);
    await screen.findByText("등록된 자격증이 없습니다.");
    const category = screen.getByRole("button", { name: "자격증" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("등록된 자격증이 없습니다.")).toBeVisible());
  });

  it("nullable owned dates, catalog-only selector와 blank-preserving edit controls만 렌더한다", async () => {
    render(<CertificationShell />);
    const entry = await screen.findByTestId("certification-entry");
    expect(entry).toHaveTextContent("취득일 미등록");
    expect(screen.queryByLabelText("자격증")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "자격증" }), { key: "Enter", altKey: true });
    const selector = screen.getByLabelText("자격증") as HTMLSelectElement;
    expect(Array.from(selector.options, ({ text }) => text)).toEqual(["선택…", "Kubernetes · CNCF"]);
    expect(screen.queryByText("React Developer 자격증")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(entry);
    expect(screen.getAllByText("미등록", { selector: "dd" })).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "날짜 저장" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "날짜 저장" }));
    expect(api.updatePlayerCertificationApi).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("변경할 만료일"), { target: { value: "2027-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "날짜 저장" }));

    await waitFor(() => expect(api.updatePlayerCertificationApi).toHaveBeenCalledWith(1, { expiresDate: "2027-08-01" }));
    expect(api.updatePlayerCertificationApi.mock.calls[0][1]).not.toHaveProperty("acquiredDate");
    expect(api.updatePlayerCertificationApi.mock.calls[0][1]).not.toEqual(expect.objectContaining({ expiresDate: "" }));
    await waitFor(() => expect(screen.getByText("2027-08-01")).toBeInTheDocument());
  });

  it("등록 실패 오류와 입력을 같은 슬롯에 유지하고 중복 제출 없이 재시도 후 목록으로 돌아간다", async () => {
    const body = { acquiredDate: "2026-09-01", expiresDate: "2027-09-01" };
    const registered: PlayerCertificationInfo = { ...devopsOwned, ...body };
    let finish!: (result: { certificationId: number } & typeof body) => void;
    const retry = new Promise<{ certificationId: number } & typeof body>((resolve) => { finish = resolve; });
    api.getPlayerCertificationsApi.mockReset().mockResolvedValue([owned]);
    api.registerPlayerCertificationApi.mockReset().mockRejectedValueOnce(new Error("등록 실패")).mockReturnValueOnce(retry);
    render(<CertificationShell />);
    await screen.findByTestId("certification-entry");
    fireEvent.keyDown(screen.getByRole("button", { name: "자격증" }), { key: "Enter", altKey: true });
    const slot = document.querySelector(".lag-create-slot");
    const form = screen.getByRole("button", { name: "자격증 저장" }).closest("form")!;
    fireEvent.change(screen.getByLabelText("자격증"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("취득일"), { target: { value: body.acquiredDate } });
    fireEvent.change(screen.getByLabelText("만료일"), { target: { value: body.expiresDate } });
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);

    const alert = await screen.findByRole("alert", { hidden: false });
    await waitFor(() => expect(alert).toBeVisible());
    expect(alert).toHaveTextContent("요청 결과가 확정되지 않았습니다. 다시 조회한 서버 상태를 확인하세요. 등록 실패");
    expect(screen.getAllByRole("alert", { hidden: true })).toHaveLength(1);
    expect(document.querySelector(".lag-create-slot")).toBe(slot);
    expect(document.querySelector("[data-create-form] form")).toBe(form);
    expect(screen.getByLabelText("자격증")).toHaveValue("3");
    expect(screen.getByLabelText("취득일")).toHaveValue(body.acquiredDate);
    expect(screen.getByLabelText("만료일")).toHaveValue(body.expiresDate);
    expect(screen.getByRole("button", { name: "자격증 저장" })).toBeEnabled();
    expect(api.getPlayerCertificationsApi).toHaveBeenCalledTimes(2);
    expect(api.registerPlayerCertificationApi).toHaveBeenCalledExactlyOnceWith(3, body);

    api.getPlayerCertificationsApi.mockResolvedValue([owned, registered]);
    fireEvent.submit(form);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    expect(screen.getByLabelText("자격증")).toBeDisabled();
    expect(screen.getByLabelText("취득일")).toBeDisabled();
    expect(screen.getByLabelText("만료일")).toBeDisabled();
    fireEvent.submit(form);
    expect(api.registerPlayerCertificationApi).toHaveBeenCalledTimes(2);
    expect(api.registerPlayerCertificationApi).toHaveBeenLastCalledWith(3, body);
    await act(async () => { finish({ certificationId: 3, ...body }); });

    await waitFor(() => expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Kubernetes · CNCF · 취득일 2026-09-01/)).toBeVisible());
    expect(document.querySelector(".lag-create-slot")).toBe(slot);
    expect(screen.queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
    expect(api.getPlayerCertificationsApi).toHaveBeenCalledTimes(3);
  });

  it("실패 후 취소와 외부 새 생성 요청은 이전 오류를 남기지 않는다", async () => {
    api.registerPlayerCertificationApi.mockReset().mockRejectedValue(new Error("이전 등록 실패"));
    const { rerender } = render(<CertificationShell />);
    await screen.findByTestId("certification-entry");
    fireEvent.keyDown(screen.getByRole("button", { name: "자격증" }), { key: "Enter", altKey: true });
    fireEvent.change(screen.getByLabelText("자격증"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
    await screen.findByRole("alert", { hidden: false });
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
    rerender(<CertificationShell createRequest={1} />);
    expect(screen.getByRole("button", { name: "자격증 저장" })).toBeInTheDocument();
    expect(screen.queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
    expect(api.registerPlayerCertificationApi).toHaveBeenCalledTimes(1);
  });

  it("등록 후 재조회 실패는 입력을 유지한 활성 폼에서 보여준다", async () => {
    api.getPlayerCertificationsApi.mockReset().mockResolvedValueOnce([owned]).mockRejectedValue(new Error("조회 실패"));
    render(<CertificationShell />);
    await screen.findByTestId("certification-entry");
    fireEvent.keyDown(screen.getByRole("button", { name: "자격증" }), { key: "Enter", altKey: true });
    fireEvent.change(screen.getByLabelText("자격증"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "자격증 저장" }));
    const form = document.querySelector("[data-create-form]")!;
    expect(await within(form as HTMLElement).findByRole("alert")).toHaveTextContent("자격증 변경 후 목록을 다시 조회하지 못했습니다");
    expect(screen.getByLabelText("자격증")).toHaveValue("3");
    expect(api.registerPlayerCertificationApi).toHaveBeenCalledTimes(1);
  });

  it("catalog category를 즉시 필터링하고 제외된 detail을 닫은 뒤 list에 focus한다", async () => {
    api.getPlayerCertificationsApi.mockReset().mockResolvedValue([owned, devopsOwned]);
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    render(<CertificationShell />);

    const entries = await screen.findAllByTestId("certification-entry");
    fireEvent.click(entries[0]);
    expect(document.querySelector('[data-stage-key="player-certification-detail"]')).toBeInTheDocument();
    focus.mockClear();

    fireEvent.change(screen.getByLabelText("자격증 분류"), { target: { value: "DevOps" } });
    const list = document.querySelector('[data-stage-key="player-certification-list"]') as HTMLElement;
    expect(within(list).queryByText(/AWS/)).not.toBeInTheDocument();
    expect(within(list).getByText(/Kubernetes/)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('[data-stage-key="player-certification-detail"]')).not.toBeInTheDocument());
    expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "player-certification-list" } });

    fireEvent.change(screen.getByLabelText("자격증 분류"), { target: { value: "ALL" } });
    expect(within(list).getByText(/AWS/)).toBeInTheDocument();
    expect(within(list).getByText(/Kubernetes/)).toBeInTheDocument();
    expect(screen.queryByLabelText("자격증")).not.toBeInTheDocument();
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });

  it("detail Back은 선택을 닫고 list stage로 복귀한다", async () => {
    const focus = vi.fn();
    window.addEventListener(STAGE_FOCUS_EVENT, focus);
    render(<CertificationShell />);
    fireEvent.click(await screen.findByTestId("certification-entry"));

    fireEvent.click(screen.getByRole("button", { name: "내 자격증 목록으로" }));

    await waitFor(() => expect(document.querySelector('[data-stage-key="player-certification-detail"]')).not.toBeInTheDocument());
    expect(focus.mock.calls.at(-1)?.[0]).toMatchObject({ detail: { key: "player-certification-list", align: "back" } });
    window.removeEventListener(STAGE_FOCUS_EVENT, focus);
  });
  it("읽기 전용 상세에서 수정 실패 입력을 보존하고 취소·삭제 취소를 처리한다", async () => {
    api.getPlayerCertificationsApi.mockReset().mockResolvedValue([owned]);
    api.updatePlayerCertificationApi.mockRejectedValueOnce(new Error("수정 실패"));
    render(<CertificationShell />);
    fireEvent.click(await screen.findByTestId("certification-entry"));
    expect(screen.queryByLabelText("변경할 만료일")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("변경할 만료일"), { target: { value: "2027-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "날짜 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("수정 실패");
    expect(screen.getByLabelText("변경할 만료일")).toHaveValue("2027-08-01");
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByLabelText("변경할 만료일")).not.toBeInTheDocument();
    expect(screen.getByText("자격증 상세")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(await screen.findByRole("button", { name: /취소/ }));
    expect(api.deletePlayerCertificationApi).not.toHaveBeenCalled();
  });

  it("편집 응답이 늦어도 이동한 항목의 상세를 유지한다", async () => {
    let finish!: (value: unknown) => void;
    api.getPlayerCertificationsApi.mockReset().mockResolvedValue([owned, devopsOwned]);
    api.updatePlayerCertificationApi.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<CertificationShell />);
    const entries = await screen.findAllByTestId("certification-entry");
    fireEvent.click(entries[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
    fireEvent.change(screen.getByLabelText("변경할 만료일"), { target: { value: "2027-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "날짜 저장" }));
    fireEvent.click(entries[1]);
    await act(async () => { finish({}); });
    const detail = document.querySelector('[data-stage-key="player-certification-detail"]')!;
    expect(within(detail as HTMLElement).getByText("Kubernetes")).toBeInTheDocument();
    expect(within(detail as HTMLElement).queryByLabelText("변경할 만료일")).not.toBeInTheDocument();
  });

});
