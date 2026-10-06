import { answerDialog } from "@/shared/ui/dialogTest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonDetail, RoleDetail, RoleEventDetail, RoleRelationDetail } from "@/shared/api/types";
import { ApiError } from "@/shared/api/client";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import { RoleContextPanel } from "@/widgets/left-context/ui/RoleContextPanel";
import RoleShell from "./RoleShell";

const api = vi.hoisted(() => ({
  archiveRoleApi: vi.fn(),
  getRoleRelationApi: vi.fn(),
  getPersonApi: vi.fn(),
  resolveRelationPersonStatus: vi.fn(),
  createRoleApi: vi.fn(),
  archiveRoleRelationApi: vi.fn(),
  createPersonApi: vi.fn(),
  createRoleRelationApi: vi.fn(),
  getRoleEventApi: vi.fn(),
  createRoleEventApi: vi.fn(),
  updateRoleEventApi: vi.fn(),
  completeRoleEventApi: vi.fn(),
  cancelRoleEventApi: vi.fn(),
  addRoleEventParticipantApi: vi.fn(),
  removeRoleEventParticipantApi: vi.fn(),
  listPersonsApi: vi.fn(),
  listRoleEventsApi: vi.fn(),
  listRoleRelationsApi: vi.fn(),
  updateRoleApi: vi.fn(),
  updateRoleRelationApi: vi.fn(),
}));
vi.mock("./api", () => api);
const schedule = vi.hoisted(() => ({ roleSchedule: vi.fn() }));
vi.mock("./scheduleApi", async (original) => ({ ...await original<typeof import("./scheduleApi")>(), ...schedule }));

const roles: RoleDetail[] = [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
  { id: 2, roleType: "FAMILY", name: "Family Member", description: "Be present", status: "ACTIVE", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", version: 0 },
];
const person: PersonDetail = { id: 7, linkedUserId: 44, displayName: "Alex", notes: null, birthday: null, contact: null, status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const relation: RoleRelationDetail = { id: 9, personId: 7, personDisplayName: "Alex", linkedUserId: 44, relationType: "FRIEND", roleNotes: "Call monthly", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const roleEvent: RoleEventDetail = { id: 11, roleId: 1, title: "Architecture review", description: "Review boundaries", startsAt: null, endsAt: null, status: "PLANNED", completedAt: null, participants: [{ participantLinkId: 1, participantType: "SERVICE_USER", participantId: 99 }], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const otherEvent: RoleEventDetail = { ...roleEvent, id: 12, title: "Design review", description: "Review design" };
const scheduleRow = (event: RoleEventDetail) => ({ sourceType: "ROLE_EVENT" as const, sourceId: event.id, roleId: event.roleId, guildId: null, guildName: null, title: event.title, startsAt: event.startsAt, endsAt: event.endsAt, status: event.status, myRsvp: null });
const schedulePage = (events: RoleEventDetail[]) => ({ contents: events.map(scheduleRow), page: 0, size: 20, totalElements: events.length, totalPages: events.length ? 1 : 0 });

function deferred<T>() {
  let reject!: (reason?: unknown) => void;
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function Harness({ initialRoleId = 1, availableRoles = roles, loading = false, error = null, refresh = vi.fn().mockResolvedValue(undefined) }: { initialRoleId?: number | null; availableRoles?: RoleDetail[]; loading?: boolean; error?: string | null; refresh?: () => Promise<void> }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(initialRoleId);
  const [hideRoleDetails, setHideRoleDetails] = useState(false);
  const [roleCreateRequest, setRoleCreateRequest] = useState(0);
  const [editRequest, setEditRequest] = useState<{ id: number; sequence: number } | null>(null);
  const selectRole = (id: number) => { setSelectedRoleId(id); setHideRoleDetails(false); };
  return (
    <>
      <RoleContextPanel workspace="roles" onWorkspaceChange={(_, create) => { if (create) { setHideRoleDetails(true); setRoleCreateRequest((value) => value + 1); } else { setSelectedRoleId(null); setHideRoleDetails(false); } }} />
      <RoleShell roles={availableRoles} rolesLoading={loading} rolesError={error} roleCreateRequest={roleCreateRequest} onEditRole={(id) => { selectRole(id); setEditRequest((current) => ({ id, sequence: (current?.sequence ?? 0) + 1 })); }} editRequest={editRequest} selectedRoleId={selectedRoleId} hideRoleDetails={hideRoleDetails} onSelectRole={(id) => { setSelectedRoleId(id); setHideRoleDetails(false); }} onRefresh={refresh} />
    </>
  );
}

describe("실제 Role shell을 사용할 때", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.getPersonApi.mockResolvedValue(person);
    api.getRoleRelationApi.mockResolvedValue(relation);
    api.resolveRelationPersonStatus.mockImplementation((relations: RoleRelationDetail[]) => Promise.resolve(relations.map((r) => ({ ...r, personStatus: r.personStatus ?? "ACTIVE" }))));
    api.listPersonsApi.mockResolvedValue([person]);
    api.listRoleRelationsApi.mockResolvedValue([relation]);
    api.listRoleEventsApi.mockResolvedValue([roleEvent]);
    schedule.roleSchedule.mockImplementation((_roleId, options) => Promise.resolve(schedulePage(options.unscheduled ? [roleEvent] : [])));
    api.getRoleEventApi.mockResolvedValue(roleEvent);
    api.createRoleEventApi.mockResolvedValue(roleEvent);
    api.completeRoleEventApi.mockResolvedValue({ ...roleEvent, status: "COMPLETED" });
    api.createPersonApi.mockResolvedValue(person);
    api.createRoleRelationApi.mockResolvedValue(relation);
    api.updateRoleRelationApi.mockResolvedValue({ ...relation, relationType: "MENTOR" });
  });

  it("Role list/surface/detail/form이 shared semantic material만 사용한다", () => {
    const source = readFileSync("features/role/RoleShell.tsx", "utf8");
    const selector = readFileSync("widgets/left-context/ui/RoleContextPanel.tsx", "utf8");

    expect(source).toContain("lag-role-summary");
    expect(selector).toContain("data-role-selector");
    expect(source).not.toMatch(/PanelCard|GoldRow|outline:\s*["']?none|Knowledge|Consistency|Connection|Confidence|Role (?:score|rank|level)/i);
    expect(`${source}\n${selector}`).not.toContain("data-theme");

    const css = readFileSync("app/globals.css", "utf8");
    const roleCss = css.slice(css.indexOf("/* v7 Role"), css.indexOf(".lag-semantic-controls"));
    expect(roleCss).toContain("var(--lag-muted-surface)");
    expect(roleCss).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
    expect(css).toContain('.lag-role-shell [data-stage-key="role-summary"]');
    expect(css).toContain("@media (max-width: 767px)");
  });

  it("실제 Role summary/detail stage wrapper가 shared wide width budget을 소유한다", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /개요/ }));

    const summary = document.querySelector('[data-stage-key="role-summary"]');
    const detail = document.querySelector('[data-stage-key="role-detail"]');
    expect(summary).toHaveClass("lag-panel-stage");
    expect(detail).toHaveClass("lag-panel-stage");

    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.lag-workspace\[data-wide-stage-fit="true"\] \.lag-panel-stage\s*{[^}]*min-width:\s*0;[^}]*max-width:\s*var\(--lag-wide-stage-max\)/);
    expect(css).toMatch(/\.lag-workspace\[data-wide-stage-fit="true"\] \.lag-panel-frame\s*{[^}]*max-width:\s*var\(--lag-wide-stage-max\)/);
  });

  describe("Role 목록을 탐색하고 관리하면", () => {
    it("생성 취소는 선택을 보존한 목록으로 돌아오고 이전 상세를 다시 열지 않는다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /개요/ }));
      fireEvent.keyDown(screen.getByRole("button", { name: "역할" }), { key: "Enter", altKey: true });
      expect(screen.getByLabelText("역할 이름")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "역할 목록으로" }));
      const selected = screen.getByRole("button", { name: /Backend Engineer.*활성/ });
      expect(selected).toHaveAttribute("aria-pressed", "true");
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-summary"]')).not.toBeInTheDocument());
      fireEvent.click(selected);
      expect(document.querySelector('[data-stage-key="role-summary"]')).toBeInTheDocument();
      expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument();
    });

    it("canonical selector가 loading/empty/error/retry와 선택·create·edit·archive 흐름을 제공한다", async () => {
      const refresh = vi.fn().mockResolvedValue(undefined);
      const loading = render(<Harness loading availableRoles={[]} initialRoleId={null} refresh={refresh} />);
      expect(screen.getByText("역할을 불러오는 중…")).toBeInTheDocument();
      loading.unmount();

      const failed = render(<Harness availableRoles={[]} initialRoleId={null} error="Role load failed" refresh={refresh} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Role load failed");
      fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
      expect(refresh).toHaveBeenCalled();
      failed.unmount();

      const empty = render(<Harness availableRoles={[]} initialRoleId={null} refresh={refresh} />);
      expect(screen.getByText(/등록된 역할이 없습니다./)).toBeInTheDocument();
      empty.unmount();

      render(<Harness initialRoleId={null} refresh={refresh} />);
      fireEvent.click(screen.getByRole("button", { name: /Family Member.*활성/ }));
      expect(screen.getByText("Be present")).toBeInTheDocument();
      expect(screen.queryByText("Knowledge")).not.toBeInTheDocument();

      expect(screen.getByRole("button", { name: "역할" })).toBeInTheDocument();

      fireEvent.keyDown(screen.getByRole("button", { name: /Family Member.*활성/ }), { key: "F10", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "수정" }));
      fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "Family Anchor" } });
      fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
      await waitFor(() => expect(api.updateRoleApi).toHaveBeenCalledWith(2, { roleType: "FAMILY", name: "Family Anchor", description: "Be present" }));

      fireEvent.keyDown(screen.getByRole("button", { name: /Family Member.*활성/ }), { key: "F10", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
      await answerDialog();
      await waitFor(() => expect(api.archiveRoleApi).toHaveBeenCalledWith(2));
      expect(refresh).toHaveBeenCalled();
    });

    it("Role edit 실패 중 pending과 draft를 보존하고 Cancel로 summary에 돌아간다", async () => {
      const saving = deferred<RoleDetail>();
      api.updateRoleApi.mockReturnValue(saving.promise);
      render(<Harness />);

      fireEvent.keyDown(screen.getByRole("button", { name: /Backend Engineer.*활성/ }), { key: "F10", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "수정" }));
      fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "Draft Role" } });
      fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
      expect(screen.getByRole("button", { name: "저장 중…" })).toBeDisabled();

      saving.reject(new Error("Role save failed"));
      expect(await screen.findByRole("alert")).toHaveTextContent("Role save failed");
      expect(screen.getByLabelText("역할 이름")).toHaveValue("Draft Role");
      fireEvent.click(screen.getByRole("button", { name: "취소" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
      expect(document.querySelector('[data-stage-key="role-summary"]')).toBeInTheDocument();
    });
  });

  it("이전 역할 저장이 늦게 끝나도 새 역할 선택과 패널을 닫지 않는다", async () => {
    const saving = deferred<RoleDetail>();
    const refresh = vi.fn().mockResolvedValue(undefined);
    api.updateRoleApi.mockReturnValueOnce(saving.promise);
    render(<Harness refresh={refresh} />);
    fireEvent.keyDown(screen.getByRole("button", { name: /Backend Engineer.*활성/ }), { key: "F10", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "수정" }));
    fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
    fireEvent.click(screen.getByRole("button", { name: /Family Member.*활성/ }));
    fireEvent.click(screen.getByRole("button", { name: /개요/ }));
    await act(async () => saving.resolve(roles[0]));
    expect(screen.getAllByText("Be present").length).toBeGreaterThan(0);
    expect(document.querySelector('[data-stage-key="role-detail"]')).toHaveTextContent("Family Member");
  });

  describe("Role을 선택하지 않은 상태이면", () => {
    it("첫 Role을 자동 선택하지 않고 downstream stage/API를 열지 않는다", () => {
      const onSelectRole = vi.fn();
      render(<RoleShell roles={roles} selectedRoleId={null} onSelectRole={onSelectRole} onRefresh={vi.fn()} />);

      expect(onSelectRole).not.toHaveBeenCalled();
      expect(document.querySelector('[data-stage-key="role-list"]')).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /개요/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Build systems")).not.toBeInTheDocument();
      expect(api.listPersonsApi).not.toHaveBeenCalled();
      expect(api.listRoleRelationsApi).not.toHaveBeenCalled();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();
      expect(schedule.roleSchedule).not.toHaveBeenCalled();
    });

    it("Role 선택은 surfaces만 열고 surface 선택 후 detail을 열며 Role 교체 시 detail을 닫는다", async () => {
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      render(<Harness initialRoleId={null} />);
      const selector = document.querySelector("[data-role-selector]");

      fireEvent.click(screen.getByRole("button", { name: /Backend Engineer.*활성/ }));
      expect(screen.getByRole("button", { name: /개요/ })).toBeInTheDocument();
      expect(screen.getByText("Build systems")).toBeInTheDocument();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /개요/ }));
      expect(document.querySelector('[data-stage-key="role-detail"]')).toBeInTheDocument();
      focus.mockClear();
      fireEvent.click(screen.getByRole("button", { name: /일정/ }));
      await waitFor(() => expect(schedule.roleSchedule).toHaveBeenCalledWith(1, expect.objectContaining({ unscheduled: false, source: "ALL" })));
      expect(focus).toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Family Member.*활성/ }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
      expect(screen.getByText("Be present")).toBeInTheDocument();
      expect(document.querySelector("[data-role-selector]")).toBe(selector);

      fireEvent.click(screen.getByRole("button", { name: /Backend Engineer.*활성/ }));
      expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument();
      expect(screen.queryByText("역할 개요")).not.toBeInTheDocument();
      window.removeEventListener(STAGE_FOCUS_EVENT, focus);
    });

    it("surface Back은 selected Role summary를 유지하고 summary Back은 selector로 돌아간다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /개요/ }));
      expect(await screen.findByText("역할 개요")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "역할 Backend Engineer로" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
      expect(document.querySelector('[data-stage-key="role-summary"]')).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "역할 목록으로" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-summary"]')).not.toBeInTheDocument());
      expect(document.querySelector("[data-role-selector]")).toBeInTheDocument();
    });

    it("Role이 비어 있으면 downstream API를 호출하지 않는다", () => {
      render(<Harness initialRoleId={null} availableRoles={[]} />);

      expect(api.listPersonsApi).not.toHaveBeenCalled();
      expect(api.listRoleRelationsApi).not.toHaveBeenCalled();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();
      expect(schedule.roleSchedule).not.toHaveBeenCalled();
    });
  });

  describe("다른 surface에서 Role identity를 preselect하면", () => {
    it("Role 목록이 loading되는 동안 선택 ID를 지우지 않는다", () => {
      const onSelectRole = vi.fn();

      render(<RoleShell roles={[]} selectedRoleId={2} onSelectRole={onSelectRole} onRefresh={vi.fn()} />);

      expect(onSelectRole).not.toHaveBeenCalledWith(null);
    });
  });

  it("관계 메뉴 더블클릭은 연결 폼을 열고 기본 클릭은 목록을 연다", async () => {
    render(<Harness />);
    const menu = screen.getByRole("button", { name: /관계.*연결된 기존 인물/ });
    fireEvent.click(menu, { detail: 1 }); fireEvent.click(menu, { detail: 2 });
    await screen.findByLabelText("기존 인물");
    fireEvent.click(screen.getByRole("button", { name: "관계 목록으로" }));
    fireEvent.click(screen.getByRole("button", { name: "역할 Backend Engineer로" }));
    await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
    fireEvent.click(menu, { detail: 0 });
    await screen.findByRole("button", { name: /Alex.*친구/ });
    expect(screen.queryByLabelText("기존 인물")).not.toBeInTheDocument();
  });

  describe("Relations surface에서 Person과 관계를 관리하면", () => {
    it("기존 Person을 선택해 Relation을 연결·수정·보관한다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /관계/ }));
      await screen.findByRole("button", { name: /Alex.*친구/ });
      expect(screen.queryByLabelText("인물 이름")).not.toBeInTheDocument();
      const menu = screen.getByRole("button", { name: /관계.*연결된 기존 인물/ });
      fireEvent.keyDown(menu, { key: "Enter", altKey: true });
      fireEvent.change(screen.getByLabelText("기존 인물"), { target: { value: "7" } });
      fireEvent.change(screen.getByLabelText("관계 유형"), { target: { value: "FAMILY" } });
      fireEvent.change(screen.getByLabelText("역할 메모"), { target: { value: "Call weekly" } });
      fireEvent.click(screen.getByRole("button", { name: "관계 저장" }));
      await waitFor(() => expect(api.createRoleRelationApi).toHaveBeenCalledWith(1, { personId: 7, relationType: "FAMILY", roleNotes: "Call weekly" }));
      await waitFor(() => expect(screen.queryByLabelText("기존 인물")).not.toBeInTheDocument());
      fireEvent.keyDown(screen.getByRole("button", { name: /Alex.*친구/ }), { key: "F10", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "수정" }));
      fireEvent.change(await screen.findByLabelText("관계 유형"), { target: { value: "MENTOR" } });
      fireEvent.click(screen.getByRole("button", { name: "관계 저장" }));
      await waitFor(() => expect(api.updateRoleRelationApi).toHaveBeenCalledWith(1, 9, { relationType: "MENTOR", roleNotes: "Call monthly" }));
      fireEvent.keyDown(screen.getByRole("button", { name: /Alex.*친구/ }), { key: "F10", shiftKey: true });
      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
    await answerDialog();
      await waitFor(() => expect(api.archiveRoleRelationApi).toHaveBeenCalledWith(1, 9));
      expect(api.createPersonApi).not.toHaveBeenCalled();
    });
  });

  describe("일정 화면을 열면", () => {
    it("목록과 읽기 상세를 다른 패널에 두고, 상태 명령을 명시적으로 호출한다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /일정/ }));
      fireEvent.click(screen.getByRole("button", { name: "시간 미정 보기" }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-event-detail"]')).toHaveTextContent("Review boundaries"));
      expect(document.querySelector('[data-stage-key="role-detail"]')).not.toHaveTextContent("Review boundaries");
      expect(screen.getByText("서비스 사용자 #99")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "완료" }));
      await answerDialog();
      await waitFor(() => expect(api.completeRoleEventApi).toHaveBeenCalledWith(1, 11));
    });

    it("일정 더블클릭은 생성 폼을 열고 실패해도 입력을 유지한다", async () => {
      api.createRoleEventApi.mockRejectedValueOnce(new ApiError(403, "ROL-403-EVENT-COMMAND-GATED", "Role event commands are not available"));
      render(<Harness />);
      const menu = screen.getByRole("button", { name: /일정.*역할 일정/ });
      fireEvent.click(menu);
      fireEvent.keyDown(menu, { key: "Enter", altKey: true });
      expect(await screen.findByRole("textbox", { name: "제목" })).toBeInTheDocument();
      fireEvent.change(screen.getByRole("textbox", { name: "제목" }), { target: { value: "New event" } });
      fireEvent.click(screen.getByRole("button", { name: "일정 저장" }));
      await waitFor(() => expect(api.createRoleEventApi).toHaveBeenCalledWith(1, { title: "New event", description: null, startsAt: null, endsAt: null }));
      expect(await screen.findByRole("alert")).toHaveTextContent("현재 서버에서 일정 변경이 허용되지 않습니다.");
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveValue("New event");
    });

    it("늦은 이전 일정 상세 응답을 선택한 다른 일정에 표시하지 않는다", async () => {
      const first = deferred<RoleEventDetail>();
      const second = deferred<RoleEventDetail>();
      schedule.roleSchedule.mockImplementation((_roleId, options) => Promise.resolve(schedulePage(options.unscheduled ? [roleEvent, otherEvent] : [])));
      api.getRoleEventApi.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /일정/ }));
      fireEvent.click(screen.getByRole("button", { name: "시간 미정 보기" }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(screen.getByRole("button", { name: /Design review/ }));
      await act(async () => second.resolve(otherEvent));
      await act(async () => first.resolve(roleEvent));
      expect(document.querySelector('[data-stage-key="role-event-detail"]')).toHaveTextContent("Review design");
      expect(document.querySelector('[data-stage-key="role-event-detail"]')).not.toHaveTextContent("Review boundaries");
    });
  });
  it("개요·관계·일정 전환은 상위 frame을 유지하고 마지막 내용만 표시한다", async () => {
    render(<Harness />);
    const summary = document.querySelector('[data-stage-key="role-summary"] .lag-panel-frame');
    fireEvent.click(screen.getByRole("button", { name: /개요/ }));
    fireEvent.click(screen.getByRole("button", { name: /관계/ }));
    fireEvent.click(screen.getByRole("button", { name: /일정/ }));
    expect(document.querySelector('[data-stage-key="role-summary"] .lag-panel-frame')).toBe(summary);
    expect(document.querySelector('[data-stage-key="role-detail"]')).toHaveTextContent("Backend Engineer · 일정");
    expect(document.querySelector('[data-stage-key="role-relation-detail"]')).not.toBeInTheDocument();
  });

});
