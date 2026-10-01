import { answerDialog } from "@/shared/ui/dialogTest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { PersonDetail, RoleRelationDetail } from "@/shared/api/types";
import RelationPanels from "./RelationPanels";

const api = vi.hoisted(() => ({ listPersonsApi: vi.fn(), listRoleRelationsApi: vi.fn(), resolveRelationPersonStatus: vi.fn(), getRoleRelationApi: vi.fn(), createRoleRelationApi: vi.fn(), updateRoleRelationApi: vi.fn(), archiveRoleRelationApi: vi.fn(), archivePersonApi: vi.fn() }));
vi.mock("./api", () => api);
const person = { id: 7, displayName: "Alex", status: "ACTIVE" } as PersonDetail;
const relation = { id: 9, personId: 7, personDisplayName: "Alex", personStatus: "ACTIVE", relationType: "FRIEND", roleNotes: null, status: "ACTIVE" } as RoleRelationDetail;
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((done) => { resolve = done; }); return { promise, resolve }; }
beforeEach(() => {
  vi.resetAllMocks();
  api.listPersonsApi.mockResolvedValue([person]); api.listRoleRelationsApi.mockResolvedValue([relation]);
  api.resolveRelationPersonStatus.mockImplementation((rows: RoleRelationDetail[]) => Promise.resolve(rows));
  api.getRoleRelationApi.mockResolvedValue(relation); api.createRoleRelationApi.mockResolvedValue(relation); api.updateRoleRelationApi.mockResolvedValue(relation); api.archiveRoleRelationApi.mockResolvedValue(undefined);
});
it("같은 Person을 두 역할에서 재사용하고 특정 관계 보관은 Person과 다른 관계를 유지한다", async () => {
  const stored = new Map<number, RoleRelationDetail[]>([[1, []], [2, []]]);
  api.listRoleRelationsApi.mockImplementation((id: number) => Promise.resolve(stored.get(id)));
  api.createRoleRelationApi.mockImplementation((id: number) => { stored.set(id, [{ ...relation, id: id + 8 }]); return Promise.resolve(relation); });
  api.archiveRoleRelationApi.mockImplementation((id: number) => { stored.set(id, []); return Promise.resolve(); });
  const props = { roleId: 1, roleName: "첫 역할", createRequest: 0, onBack: vi.fn() };
  const view = render(<RelationPanels key={1} {...props} />);
  for (const id of [1, 2]) {
    if (id === 2) view.rerender(<RelationPanels key={2} {...props} roleId={2} roleName="두 번째 역할" />);
    await screen.findByText("연결된 인물이 없습니다.");
    expect(screen.queryByLabelText("기존 인물")).not.toBeInTheDocument();
    view.rerender(<RelationPanels key={id} {...props} roleId={id} roleName={id === 1 ? "첫 역할" : "두 번째 역할"} createRequest={1} />);
    fireEvent.change(screen.getByLabelText("기존 인물"), { target: { value: "7" } });
    fireEvent.change(screen.getByLabelText("관계 유형"), { target: { value: "FAMILY" } });
    fireEvent.click(screen.getByRole("button", { name: "관계 저장" }));
    await waitFor(() => expect(api.createRoleRelationApi).toHaveBeenCalledWith(id, { personId: 7, relationType: "FAMILY", roleNotes: null }));
    await screen.findByRole("button", { name: /Alex.*친구/ });
  }
  view.rerender(<RelationPanels key={1} {...props} />);
  fireEvent.keyDown(await screen.findByRole("button", { name: /Alex.*친구|Alex.*보관된 인물/ }), { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog(false);
    expect(api.archiveRoleRelationApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog();
  await screen.findByText("연결된 인물이 없습니다.");
  expect(api.archiveRoleRelationApi).toHaveBeenCalledWith(1, 9);
  expect(api.archivePersonApi).not.toHaveBeenCalled(); expect(person.status).toBe("ACTIVE"); expect(stored.get(2)).toHaveLength(1);
});
it("보관 상태·미확인을 표시하며 취소와 늦은 이전 역할 목록·저장은 새 역할을 덮지 않는다", async () => {
  const first = deferred<RoleRelationDetail[]>(), saving = deferred<RoleRelationDetail>();
  api.listRoleRelationsApi.mockReturnValueOnce(first.promise).mockResolvedValue([{ ...relation, personStatus: "ARCHIVED" }, { ...relation, id: 10, personDisplayName: "Bea", personStatus: null }]);
  const props = { roleId: 1, roleName: "첫 역할", createRequest: 0, onBack: vi.fn() };
  const view = render(<RelationPanels key={1} {...props} />);
  view.rerender(<RelationPanels key={2} {...props} roleId={2} roleName="두 번째 역할" />);
  await screen.findByRole("button", { name: /보관된 인물/ });
  expect(screen.getByRole("button", { name: /인물 상태 미확인/ })).toBeInTheDocument();
  await act(async () => first.resolve([{ ...relation, personDisplayName: "Old role" }]));
  expect(screen.queryByText("Old role")).not.toBeInTheDocument();
  api.getRoleRelationApi.mockResolvedValue({ ...relation, personStatus: "ARCHIVED" });
  fireEvent.keyDown(screen.getByRole("button", { name: /Alex.*친구|Alex.*보관된 인물/ }), { key: "F10", shiftKey: true }); fireEvent.click(screen.getByRole("button", { name: "수정" }));
  await screen.findByLabelText("관계 유형");
  expect(screen.queryByLabelText("기존 인물")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("역할 메모"), { target: { value: "보관 인물 관계 메모" } });
  api.updateRoleRelationApi.mockReturnValueOnce(saving.promise);
  fireEvent.click(screen.getByRole("button", { name: "관계 저장" }));
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  view.rerender(<RelationPanels key={3} {...props} roleId={3} roleName="세 번째 역할" />);
  await screen.findByRole("button", { name: /보관된 인물/ });
  await act(async () => saving.resolve(relation));
  expect(screen.getByRole("heading", { name: "세 번째 역할 · 관계" })).toBeInTheDocument();
  expect(api.updateRoleRelationApi).toHaveBeenCalledWith(2, 9, { relationType: "FRIEND", roleNotes: "보관 인물 관계 메모" });
});


it("관계 분류 재진입은 목록만 남기고 새 생성은 폼 하나만 연다", async () => {
  const props = { roleId: 1, roleName: "첫 역할", createRequest: 0, onBack: vi.fn() };
  const view = render(<RelationPanels {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: /Alex.*친구/ }));
  await screen.findByText("관계 상세");
  const listFrame = document.querySelector('[data-stage-key="role-detail"] .lag-panel-frame');
  view.rerender(<RelationPanels {...props} reentryRequest={1} />);
  expect(document.querySelector('[data-stage-key="role-detail"] .lag-panel-frame')).toBe(listFrame);
  expect(document.querySelector('[data-stage-key="role-relation-detail"]')).not.toBeInTheDocument();
  view.rerender(<RelationPanels {...props} reentryRequest={1} createRequest={1} />);
  expect(document.querySelectorAll('[data-create-form] form')).toHaveLength(1);
});
