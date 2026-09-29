import { answerDialog } from "@/shared/ui/dialogTest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PersonDetail, RoleDetail } from "@/shared/api/types";
import RoleShell from "./RoleShell";

const api = vi.hoisted(() => ({ listPersonsApi: vi.fn(), getPersonApi: vi.fn(), createPersonApi: vi.fn(), updatePersonApi: vi.fn(), archivePersonApi: vi.fn() }));
vi.mock("./api", () => api);
const alex: PersonDetail = { id: 7, displayName: "Alex", notes: null, birthday: "1995-06-18", contact: null, linkedUserId: null, status: "ACTIVE", createdAt: "", updatedAt: "", version: 0 };
const bea: PersonDetail = { ...alex, id: 8, displayName: "Bea", notes: "Bea notes" };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
const props = { roles: [] as RoleDetail[], selectedRoleId: null as number | null, workspace: "persons" as const, onSelectRole: vi.fn(), onRefresh: vi.fn().mockResolvedValue(undefined) };

describe("역할과 독립된 인물 관리", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listPersonsApi.mockResolvedValue([alex, bea]);
    api.getPersonApi.mockImplementation((id: number) => Promise.resolve(id === 7 ? alex : bea));
    api.createPersonApi.mockResolvedValue(alex); api.updatePersonApi.mockResolvedValue(alex); api.archivePersonApi.mockResolvedValue(undefined);
  });
  it("빈 목록 클릭은 생성하지 않고 Alt+Enter·Escape가 같은 슬롯을 전환한다", async () => {
    api.listPersonsApi.mockReset().mockResolvedValue([]);
    render(<RoleShell {...props} />);
    await screen.findByText("등록된 인물이 없습니다.");
    const category = screen.getByRole("button", { name: "인물" });
    const slot = document.querySelector(".lag-create-slot");
    fireEvent.click(category);
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    fireEvent.keyDown(category, { key: "Enter", altKey: true });
    expect(document.querySelector("[data-create-form]")?.closest(".lag-create-slot")).toBe(slot);
    fireEvent.keyDown(document.querySelector("[data-create-form]")!, { key: "Escape" });
    expect(document.querySelector("[data-create-form]")).not.toBeInTheDocument();
    expect(screen.getByText("등록된 인물이 없습니다.")).toBeVisible();
  });

  it("Role 0개에서도 등록·nullable/date 수정·인물 보관이 되고 역할 변경은 초안을 바꾸지 않는다", async () => {
    const view = render(<RoleShell {...props} />);
    await screen.findByRole("button", { name: /Alex.*인물/ });
    const scroll = document.querySelector<HTMLElement>('[data-stage-key="person-list"] .lag-panel-body')!;
    scroll.scrollTop = 90;
    const add = screen.getByRole("button", { name: "인물" }); add.focus();
    fireEvent.keyDown(add, { key: "Enter", altKey: true });
    fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "새 인물" } });
    fireEvent.change(screen.getByLabelText("생일"), { target: { value: "2020-02-29" } });
    view.rerender(<RoleShell {...props} selectedRoleId={99} />);
    expect(screen.getByLabelText("인물 이름")).toHaveValue("새 인물");
    fireEvent.click(screen.getByRole("button", { name: "인물 등록" }));
    await waitFor(() => expect(api.createPersonApi).toHaveBeenCalledWith({ displayName: "새 인물", birthday: "2020-02-29", contact: null, notes: null }));
    await screen.findByRole("button", { name: /Alex.*인물/ });
    await waitFor(() => expect(add).toHaveFocus());
    expect(scroll.scrollTop).toBe(90);
    fireEvent.click(screen.getByRole("button", { name: "Alex 작업" }));
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    expect(await screen.findByLabelText("생일")).toHaveValue("1995-06-18");
    fireEvent.change(screen.getByLabelText("생일"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
    await waitFor(() => expect(api.updatePersonApi).toHaveBeenCalledWith(7, { displayName: "Alex", birthday: null, contact: null, notes: null }));
    fireEvent.click(screen.getByRole("button", { name: "보관" }));
    await answerDialog();
    await waitFor(() => expect(api.archivePersonApi).toHaveBeenCalledWith(7));
  });
  it("오류·취소는 목록과 초안을 보존하고 Person A의 늦은 상세·저장은 B 선택을 덮지 않는다", async () => {
    api.updatePersonApi.mockRejectedValueOnce(new Error("저장 실패"));
    const a = deferred<PersonDetail>(), saving = deferred<PersonDetail>();
    const view = render(<RoleShell {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Alex 작업" }));
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.change(await screen.findByLabelText("인물 이름"), { target: { value: "Alex draft" } });
    fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("저장 실패");
    expect(screen.getByLabelText("인물 이름")).toHaveValue("Alex draft");
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    await screen.findByRole("button", { name: /Alex.*인물/ });
    api.getPersonApi.mockReturnValueOnce(a.promise).mockResolvedValueOnce(bea);
    fireEvent.click(screen.getByRole("button", { name: /Alex.*인물/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bea.*인물/ }));
    await screen.findByText("Bea notes");
    await act(async () => a.resolve({ ...alex, notes: "old A" }));
    expect(screen.getByText("Bea notes")).toBeInTheDocument(); expect(screen.queryByText("old A")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "인물 목록으로" }));
    expect(screen.getByRole("button", { name: /Bea.*인물/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Alex 작업" }));
    fireEvent.click(screen.getByRole("button", { name: "수정" }));
    await screen.findByLabelText("인물 이름");
    api.updatePersonApi.mockReturnValueOnce(saving.promise);
    fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    fireEvent.click(screen.getByRole("button", { name: /Bea.*인물/ }));
    await screen.findByText("Bea notes");
    await act(async () => saving.resolve({ ...alex, notes: "late save" }));
    expect(screen.getByText("Bea notes")).toBeInTheDocument(); expect(screen.queryByText("late save")).not.toBeInTheDocument();
    view.rerender(<RoleShell {...props} workspace="roles" selectedRoleId={1} />);
    view.rerender(<RoleShell {...props} selectedRoleId={2} />);
    expect(screen.getByText("Bea notes")).toBeInTheDocument();
  });
});
