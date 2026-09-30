import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { HobbyCatalogInfo, PlayerHobbyInfo } from "@/shared/api/types";
import HobbyShell from "./HobbyShell";

const api = vi.hoisted(() => ({ deletePlayerHobbyApi: vi.fn(), getHobbyCatalogApi: vi.fn(), getPlayerHobbiesApi: vi.fn(), registerPlayerHobbyApi: vi.fn(), updatePlayerHobbyApi: vi.fn() }));
vi.mock("./api", () => api);
vi.mock("@/shared/ui/PanelCard", () => ({ default: ({ label, subtitle, onClick, onAction }: { label: string; subtitle: string; onClick: () => void; onAction: (type: string) => void }) => <div><button type="button" data-testid="hobby-entry" onClick={onClick}>{label} · {subtitle}</button><button type="button" onClick={() => onAction("edit")}>수정</button><button type="button" onClick={() => onAction("delete")}>삭제</button></div> }));

const catalog: HobbyCatalogInfo[] = [{ hobbyId: 1, name: "Reading", category: "Learning" }, { hobbyId: 2, name: "Running", category: "Fitness" }];
const owned: PlayerHobbyInfo = { ...catalog[0], customName: "Books", detail: null, proficiency: 40, status: "PAUSED", startedOn: null, xp: 100 };

describe("취미 management surface를 사용할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getHobbyCatalogApi.mockResolvedValue(catalog);
    api.getPlayerHobbiesApi.mockResolvedValue([owned]);
  });

  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.getPlayerHobbiesApi.mockReset().mockResolvedValue([]);
    render(<HobbyShell />);
    await screen.findByText("등록된 취미가 없습니다.");
    const category = screen.getByRole("button", { name: "취미" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("등록된 취미가 없습니다.")).toBeVisible());
  });

  it("canonical statuses, nullable fields와 catalog-only selector를 표시하고 stale values를 제거한다", async () => {
    render(<HobbyShell />);
    const entry = await screen.findByTestId("hobby-entry");
    expect(entry).toHaveTextContent("Reading · 일시 중지 · 숙련도 40/100");
    expect(screen.queryByLabelText("취미")).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "취미" }), { key: "Enter", altKey: true });
    expect(Array.from((screen.getByLabelText("취미") as HTMLSelectElement).options, ({ text }) => text)).toEqual(["선택…", "Running · 운동"]);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(entry);
    expect(screen.getAllByText("미등록").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "취미 저장" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(Array.from((screen.getByLabelText("변경할 상태") as HTMLSelectElement).options, ({ value }) => value)).toEqual(["", "ACTIVE", "PAUSED", "DROPPED"]);
    expect(screen.queryByText(/ON_HOLD|INACTIVE/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
    expect(api.updatePlayerHobbyApi).not.toHaveBeenCalled();
  });

  it("등록 실패 오류와 모든 입력을 같은 슬롯에 유지하고 중복 제출 없이 재시도 후 목록으로 돌아간다", async () => {
    const body = { customName: "Evening run", detail: "Park route", proficiency: 35, status: "ACTIVE" as const, startedOn: "2026-09-01" };
    const response = { hobbyId: 2, ...body, xp: 0 };
    const registered: PlayerHobbyInfo = { ...catalog[1], ...response };
    let finish!: (result: typeof response) => void;
    const retry = new Promise<typeof response>((resolve) => { finish = resolve; });
    api.registerPlayerHobbyApi.mockReset().mockRejectedValueOnce(new Error("등록 실패")).mockReturnValueOnce(retry);
    render(<HobbyShell />);
    await screen.findByTestId("hobby-entry");
    fireEvent.keyDown(screen.getByRole("button", { name: "취미" }), { key: "Enter", altKey: true });
    const slot = document.querySelector(".lag-create-slot");
    const form = screen.getByRole("button", { name: "취미 저장" }).closest("form")!;
    fireEvent.change(screen.getByLabelText("취미"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("취미 이름"), { target: { value: body.customName } });
    fireEvent.change(screen.getByLabelText("설명"), { target: { value: body.detail } });
    fireEvent.change(screen.getByLabelText("숙련도"), { target: { value: String(body.proficiency) } });
    fireEvent.change(screen.getByLabelText("상태"), { target: { value: body.status } });
    fireEvent.change(screen.getByLabelText("시작일"), { target: { value: body.startedOn } });
    expect(form.checkValidity()).toBe(true);
    fireEvent.submit(form);

    const alert = await screen.findByRole("alert", { hidden: false });
    await waitFor(() => expect(alert).toBeVisible());
    expect(alert).toHaveTextContent("요청 결과가 확정되지 않았습니다. 다시 조회한 서버 상태를 확인하세요. 등록 실패");
    expect(screen.getAllByRole("alert", { hidden: true })).toHaveLength(1);
    expect(document.querySelector(".lag-create-slot")).toBe(slot);
    expect(document.querySelector("[data-create-form] form")).toBe(form);
    expect(screen.getByLabelText("취미")).toHaveValue("2");
    expect(screen.getByLabelText("취미 이름")).toHaveValue(body.customName);
    expect(screen.getByLabelText("설명")).toHaveValue(body.detail);
    expect(screen.getByLabelText("숙련도")).toHaveValue(body.proficiency);
    expect(screen.getByLabelText("상태")).toHaveValue(body.status);
    expect(screen.getByLabelText("시작일")).toHaveValue(body.startedOn);
    expect(screen.getByRole("button", { name: "취미 저장" })).toBeEnabled();
    expect(api.getPlayerHobbiesApi).toHaveBeenCalledTimes(2);
    expect(api.registerPlayerHobbyApi).toHaveBeenCalledExactlyOnceWith(2, body);

    api.getPlayerHobbiesApi.mockResolvedValue([owned, registered]);
    fireEvent.submit(form);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    for (const label of ["취미", "취미 이름", "설명", "숙련도", "상태", "시작일"]) {
      expect(screen.getByLabelText(label)).toBeDisabled();
    }
    fireEvent.submit(form);
    expect(api.registerPlayerHobbyApi).toHaveBeenCalledTimes(2);
    expect(api.registerPlayerHobbyApi).toHaveBeenLastCalledWith(2, body);
    await act(async () => { finish(response); });

    await waitFor(() => expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Evening run · Running · 활동 중 · 숙련도 35\/100/)).toBeVisible());
    expect(document.querySelector(".lag-create-slot")).toBe(slot);
    expect(screen.queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
    expect(api.getPlayerHobbiesApi).toHaveBeenCalledTimes(3);
  });

  it("실패 후 목록으로 취소하고 외부 새 생성 요청을 받아도 이전 오류를 남기지 않는다", async () => {
    api.registerPlayerHobbyApi.mockReset().mockRejectedValue(new Error("이전 등록 실패"));
    const { rerender } = render(<HobbyShell />);
    await screen.findByTestId("hobby-entry");
    fireEvent.keyDown(screen.getByRole("button", { name: "취미" }), { key: "Enter", altKey: true });
    fireEvent.change(screen.getByLabelText("취미"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("취미 이름"), { target: { value: "Run" } });
    fireEvent.change(screen.getByLabelText("숙련도"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
    await screen.findByRole("alert", { hidden: false });
    fireEvent.click(screen.getByRole("button", { name: "목록으로" }));
    expect(screen.queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
    rerender(<HobbyShell createRequest={1} />);
    expect(screen.getByRole("button", { name: "취미 저장" })).toBeInTheDocument();
    expect(screen.queryByRole("alert", { hidden: true })).not.toBeInTheDocument();
    expect(api.registerPlayerHobbyApi).toHaveBeenCalledTimes(1);
  });
  it("상세와 편집을 분리하고 실패 입력·삭제 취소를 보존한다", async () => {
    api.updatePlayerHobbyApi.mockRejectedValueOnce(new Error("수정 실패"));
    render(<HobbyShell />);
    fireEvent.click(await screen.findByTestId("hobby-entry"));
    expect(screen.queryByLabelText("변경할 숙련도")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(screen.getByLabelText("변경할 숙련도"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "취미 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("수정 실패");
    expect(screen.getByLabelText("변경할 숙련도")).toHaveValue(50);
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByLabelText("변경할 숙련도")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    fireEvent.click(await screen.findByRole("button", { name: /취소/ }));
    expect(api.deletePlayerHobbyApi).not.toHaveBeenCalled();
  });

});
