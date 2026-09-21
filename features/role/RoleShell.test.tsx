import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonDetail, RoleDetail, RoleEventDetail, RoleRelationDetail } from "@/shared/api/types";
import { STAGE_FOCUS_EVENT } from "@/shared/hooks/useStageCamera";
import { RoleContextPanel } from "@/widgets/left-context/ui/RoleContextPanel";
import RoleShell from "./RoleShell";

const api = vi.hoisted(() => ({
  archiveRoleApi: vi.fn(),
  archiveRoleRelationApi: vi.fn(),
  createPersonApi: vi.fn(),
  createRoleRelationApi: vi.fn(),
  getRoleEventApi: vi.fn(),
  listPersonsApi: vi.fn(),
  listRoleEventsApi: vi.fn(),
  listRoleRelationsApi: vi.fn(),
  updateRoleApi: vi.fn(),
  updateRoleRelationApi: vi.fn(),
}));
vi.mock("./api", () => api);

const roles: RoleDetail[] = [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
  { id: 2, roleType: "FAMILY", name: "Family Member", description: "Be present", status: "ACTIVE", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", version: 0 },
];
const person: PersonDetail = { id: 7, linkedUserId: 44, displayName: "Alex", notes: null, birthday: null, contact: null, status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const relation: RoleRelationDetail = { id: 9, personId: 7, personDisplayName: "Alex", linkedUserId: 44, relationType: "FRIEND", roleNotes: "Call monthly", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const roleEvent: RoleEventDetail = { id: 11, roleId: 1, title: "Architecture review", description: "Review boundaries", startsAt: null, endsAt: null, status: "PLANNED", completedAt: null, participants: [{ participantLinkId: 1, participantType: "SERVICE_USER", participantId: 99 }], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const otherEvent: RoleEventDetail = { ...roleEvent, id: 12, title: "Design review", description: "Review design" };

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
  return (
    <>
      <RoleContextPanel roles={availableRoles} selectedRoleId={selectedRoleId} isLoading={loading} error={error} onRoleSelect={setSelectedRoleId} onRetry={() => void refresh()} />
      <RoleShell roles={availableRoles} selectedRoleId={selectedRoleId} onSelectRole={setSelectedRoleId} onRefresh={refresh} />
    </>
  );
}

describe("실제 Role shell을 사용할 때", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.listPersonsApi.mockResolvedValue([person]);
    api.listRoleRelationsApi.mockResolvedValue([relation]);
    api.listRoleEventsApi.mockResolvedValue([roleEvent]);
    api.getRoleEventApi.mockResolvedValue(roleEvent);
    api.createPersonApi.mockResolvedValue(person);
    api.createRoleRelationApi.mockResolvedValue(relation);
    api.updateRoleRelationApi.mockResolvedValue({ ...relation, relationType: "MENTOR" });
  });

  it("Role list/surface/detail/form이 shared semantic material만 사용한다", () => {
    const source = readFileSync("features/role/RoleShell.tsx", "utf8");
    const selector = readFileSync("widgets/left-context/ui/RoleContextPanel.tsx", "utf8");

    expect(source).toContain("lag-role-summary");
    expect(selector).toContain("data-role-selector");
    expect(source).not.toMatch(/role-list|PanelCard|GoldRow|outline:\s*["']?none|Knowledge|Consistency|Connection|Confidence|Role (?:score|rank|level)/i);
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
    fireEvent.click(screen.getByRole("button", { name: /Overview/ }));

    const summary = document.querySelector('[data-stage-key="role-summary"]');
    const detail = document.querySelector('[data-stage-key="role-detail"]');
    expect(summary).toHaveClass("lag-panel-stage");
    expect(detail).toHaveClass("lag-panel-stage");

    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.lag-workspace\[data-wide-stage-fit="true"\] \.lag-panel-stage\s*{[^}]*min-width:\s*0;[^}]*max-width:\s*var\(--lag-wide-stage-max\)/);
    expect(css).toMatch(/\.lag-workspace\[data-wide-stage-fit="true"\] \.lag-panel-frame\s*{[^}]*max-width:\s*var\(--lag-wide-stage-max\)/);
  });

  describe("Role 목록을 탐색하고 관리하면", () => {
    it("canonical selector가 loading/empty/error/retry와 선택·create·edit·archive 흐름을 제공한다", async () => {
      const refresh = vi.fn().mockResolvedValue(undefined);
      const loading = render(<Harness loading availableRoles={[]} initialRoleId={null} refresh={refresh} />);
      expect(screen.getByText("Loading Roles...")).toBeInTheDocument();
      loading.unmount();

      const failed = render(<Harness availableRoles={[]} initialRoleId={null} error="Role load failed" refresh={refresh} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Role load failed");
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(refresh).toHaveBeenCalled();
      failed.unmount();

      const empty = render(<Harness availableRoles={[]} initialRoleId={null} refresh={refresh} />);
      expect(screen.getByText(/No Roles yet/)).toBeInTheDocument();
      empty.unmount();

      render(<Harness initialRoleId={null} refresh={refresh} />);
      fireEvent.click(screen.getByRole("button", { name: /Family Member/ }));
      expect(screen.getByText("Be present")).toBeInTheDocument();
      expect(screen.queryByText("Knowledge")).not.toBeInTheDocument();

      expect(screen.getByRole("link", { name: "Create Role" })).toHaveAttribute("href", "/roles/create");

      fireEvent.click(screen.getByRole("button", { name: "Edit Role" }));
      fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Family Anchor" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Role" }));
      await waitFor(() => expect(api.updateRoleApi).toHaveBeenCalledWith(2, { roleType: "FAMILY", name: "Family Anchor", description: "Be present" }));

      fireEvent.click(screen.getByRole("button", { name: "Archive Role" }));
      await waitFor(() => expect(api.archiveRoleApi).toHaveBeenCalledWith(2));
      expect(refresh).toHaveBeenCalled();
    });

    it("Role edit 실패 중 pending과 draft를 보존하고 Cancel로 summary에 돌아간다", async () => {
      const saving = deferred<RoleDetail>();
      api.updateRoleApi.mockReturnValue(saving.promise);
      render(<Harness />);

      fireEvent.click(screen.getByRole("button", { name: "Edit Role" }));
      fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft Role" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Role" }));
      expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();

      saving.reject(new Error("Role save failed"));
      expect(await screen.findByRole("alert")).toHaveTextContent("Role save failed");
      expect(screen.getByLabelText("Name")).toHaveValue("Draft Role");
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
      expect(document.querySelector('[data-stage-key="role-summary"]')).toBeInTheDocument();
    });
  });

  describe("Role을 선택하지 않은 상태이면", () => {
    it("첫 Role을 자동 선택하지 않고 downstream stage/API를 열지 않는다", () => {
      const onSelectRole = vi.fn();
      render(<RoleShell roles={roles} selectedRoleId={null} onSelectRole={onSelectRole} onRefresh={vi.fn()} />);

      expect(onSelectRole).not.toHaveBeenCalled();
      expect(document.querySelector('[data-stage-key="role-list"]')).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Overview/ })).not.toBeInTheDocument();
      expect(screen.queryByText("Build systems")).not.toBeInTheDocument();
      expect(api.listPersonsApi).not.toHaveBeenCalled();
      expect(api.listRoleRelationsApi).not.toHaveBeenCalled();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();
    });

    it("Role 선택은 surfaces만 열고 surface 선택 후 detail을 열며 Role 교체 시 detail을 닫는다", async () => {
      const focus = vi.fn();
      window.addEventListener(STAGE_FOCUS_EVENT, focus);
      render(<Harness initialRoleId={null} />);
      const selector = document.querySelector("[data-role-selector]");

      fireEvent.click(screen.getByRole("button", { name: /Backend Engineer/ }));
      expect(screen.getByRole("button", { name: /Overview/ })).toBeInTheDocument();
      expect(screen.getByText("Build systems")).toBeInTheDocument();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Overview/ }));
      expect(document.querySelector('[data-stage-key="role-detail"]')).toBeInTheDocument();
      focus.mockClear();
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      await waitFor(() => expect(api.listRoleEventsApi).toHaveBeenCalledWith(1));
      expect(focus).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: /Family Member/ }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
      expect(screen.getByText("Be present")).toBeInTheDocument();
      expect(document.querySelector("[data-role-selector]")).toBe(selector);

      fireEvent.click(screen.getByRole("button", { name: /Backend Engineer/ }));
      expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument();
      expect(screen.queryByText("Role Overview")).not.toBeInTheDocument();
      window.removeEventListener(STAGE_FOCUS_EVENT, focus);
    });

    it("surface Back은 selected Role summary를 유지하고 summary Back은 selector로 돌아간다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Overview/ }));
      expect(await screen.findByText("Role Overview")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Back to Backend Engineer" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-detail"]')).not.toBeInTheDocument());
      expect(document.querySelector('[data-stage-key="role-summary"]')).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Back to Role selector" }));
      await waitFor(() => expect(document.querySelector('[data-stage-key="role-summary"]')).not.toBeInTheDocument());
      expect(document.querySelector("[data-role-selector]")).toBeInTheDocument();
    });

    it("Role이 비어 있으면 downstream API를 호출하지 않는다", () => {
      render(<Harness initialRoleId={null} availableRoles={[]} />);

      expect(api.listPersonsApi).not.toHaveBeenCalled();
      expect(api.listRoleRelationsApi).not.toHaveBeenCalled();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();
    });
  });

  describe("다른 surface에서 Role identity를 preselect하면", () => {
    it("Role 목록이 loading되는 동안 선택 ID를 지우지 않는다", () => {
      const onSelectRole = vi.fn();

      render(<RoleShell roles={[]} selectedRoleId={2} onSelectRole={onSelectRole} onRefresh={vi.fn()} />);

      expect(onSelectRole).not.toHaveBeenCalledWith(null);
    });
  });

  describe("Relations surface에서 Person과 관계를 관리하면", () => {
    it("Person을 별도 identity로 생성·선택하고 Relation을 create/update/archive한다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Relations/ }));

      expect(await screen.findByText("Linked account available · identity remains Person")).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText("Display Name"), { target: { value: "Taylor" } });
      fireEvent.click(screen.getByRole("button", { name: "Create Person" }));
      await waitFor(() => expect(api.createPersonApi).toHaveBeenCalledWith({ displayName: "Taylor", notes: null, birthday: null, contact: null }));

      fireEvent.change(screen.getByLabelText("Person"), { target: { value: "7" } });
      fireEvent.change(screen.getByLabelText("Relation Type"), { target: { value: "FAMILY" } });
      fireEvent.change(screen.getByLabelText("Role Notes"), { target: { value: "Call weekly" } });
      fireEvent.click(screen.getByRole("button", { name: "Create Relation" }));
      await waitFor(() => expect(api.createRoleRelationApi).toHaveBeenCalledWith(1, { personId: 7, relationType: "FAMILY", roleNotes: "Call weekly" }));

      fireEvent.click(screen.getByRole("button", { name: "Edit" }));
      fireEvent.change(screen.getByLabelText("Relation Type"), { target: { value: "MENTOR" } });
      fireEvent.click(screen.getByRole("button", { name: "Update Relation" }));
      await waitFor(() => expect(api.updateRoleRelationApi).toHaveBeenCalledWith(1, 9, { relationType: "MENTOR", roleNotes: "Call monthly" }));

      fireEvent.click(screen.getByRole("button", { name: "Archive" }));
      await waitFor(() => expect(api.archiveRoleRelationApi).toHaveBeenCalledWith(1, 9));
      expect(api.createPersonApi.mock.calls[0][0]).not.toHaveProperty("linkedUserId");
    });
  });

  describe("Events surface를 열면", () => {
    const gate = "역할 사건 기록은 준비 중입니다. 기록은 Journal에서 남길 수 있습니다.";

    it("기존 사건과 participant는 읽되 쓰기 control은 노출하지 않는다", async () => {
      render(<Harness />);
      expect(screen.getByText("Event history · 준비 중")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      expect(screen.getByText(gate)).toBeInTheDocument();
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));

      expect(await screen.findByText("SERVICE_USER #99")).toBeInTheDocument();
      expect(screen.queryByLabelText(/participant/i)).not.toBeInTheDocument();
      for (const name of ["Create Event", "Edit Event", "Complete Event", "Cancel Event", "Save New Event", "Update Event"]) {
        expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
      }
      expect(api.listRoleEventsApi).toHaveBeenCalledWith(1);
      expect(api.getRoleEventApi).toHaveBeenCalledWith(1, 11);
    });

    it("loading과 빈 목록에서도 gate를 보여주고 조회 실패는 retry로 복구한다", async () => {
      const loading = deferred<RoleEventDetail[]>();
      api.listRoleEventsApi.mockReturnValueOnce(loading.promise).mockResolvedValue([]);
      const empty = render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      expect(screen.getByText(gate)).toBeInTheDocument();
      expect(screen.getByText("Loading Events...")).toBeInTheDocument();
      await act(async () => loading.resolve([]));
      expect(screen.getByText(gate)).toBeInTheDocument();
      expect(screen.getByText("No Events for this Role.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Create Event" })).not.toBeInTheDocument();

      empty.unmount();
      api.listRoleEventsApi.mockRejectedValueOnce(new Error("Event list failed"));
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Event list failed");
      expect(screen.getByText(gate)).toBeInTheDocument();
      expect(screen.queryByText("No Events for this Role.")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByText("No Events for this Role.")).toBeInTheDocument();
      expect(api.listRoleEventsApi).toHaveBeenCalledTimes(3);
      expect(api.getRoleEventApi).not.toHaveBeenCalled();
    });

    it("detail 조회 실패 후 Retry가 같은 상세만 재조회해 복구한다", async () => {
      api.getRoleEventApi.mockRejectedValueOnce(new Error("Event detail failed"));
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      const row = await screen.findByRole("button", { name: /Architecture review/ });
      fireEvent.click(row);
      expect(await screen.findByRole("alert")).toHaveTextContent("Event detail failed");
      expect(screen.getByText(gate)).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Event detail" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByText("SERVICE_USER #99")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(api.getRoleEventApi).toHaveBeenCalledTimes(2);
      expect(api.getRoleEventApi).toHaveBeenNthCalledWith(2, 1, 11);
      expect(api.listRoleEventsApi).toHaveBeenCalledTimes(1);
    });

    it("같은 Role에서 B 상세가 먼저 성공하면 늦은 A 성공을 버린다", async () => {
      const first = deferred<RoleEventDetail>();
      const second = deferred<RoleEventDetail>();
      api.listRoleEventsApi.mockResolvedValue([roleEvent, otherEvent]);
      api.getRoleEventApi.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(screen.getByRole("button", { name: /Design review/ }));
      await act(async () => second.resolve(otherEvent));
      expect(screen.getByRole("region", { name: "Event detail" })).toHaveTextContent("Review design");
      await act(async () => first.resolve(roleEvent));
      expect(screen.getByRole("region", { name: "Event detail" })).toHaveTextContent("Review design");
      expect(screen.queryByText("Review boundaries")).not.toBeInTheDocument();
    });

    it("B 성공 뒤 늦은 A 실패가 B 상세와 오류 상태를 바꾸지 않는다", async () => {
      const first = deferred<RoleEventDetail>();
      const second = deferred<RoleEventDetail>();
      api.listRoleEventsApi.mockResolvedValue([roleEvent, otherEvent]);
      api.getRoleEventApi.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(screen.getByRole("button", { name: /Design review/ }));
      await act(async () => second.resolve(otherEvent));
      await act(async () => first.reject(new Error("Old detail failed")));
      expect(screen.getByRole("region", { name: "Event detail" })).toHaveTextContent("Review design");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("B 실패 뒤 늦은 A 성공이 B 오류와 Retry 대상을 바꾸지 않는다", async () => {
      const first = deferred<RoleEventDetail>();
      const second = deferred<RoleEventDetail>();
      api.listRoleEventsApi.mockResolvedValue([roleEvent, otherEvent]);
      api.getRoleEventApi.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise).mockResolvedValueOnce(otherEvent);
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(screen.getByRole("button", { name: /Design review/ }));
      await act(async () => second.reject(new Error("B detail failed")));
      await act(async () => first.resolve(roleEvent));
      expect(screen.getByRole("alert")).toHaveTextContent("B detail failed");
      expect(screen.queryByRole("region", { name: "Event detail" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
      expect(await screen.findByText("Review design")).toBeInTheDocument();
      expect(api.getRoleEventApi).toHaveBeenNthCalledWith(3, 1, 12);
      expect(api.listRoleEventsApi).toHaveBeenCalledTimes(1);
    });

    it("Role 변경 중 늦게 도착한 이전 Role detail을 보여주지 않는다", async () => {
      const pending = deferred<RoleEventDetail>();
      api.getRoleEventApi.mockReturnValueOnce(pending.promise);
      api.listRoleEventsApi.mockImplementation((roleId: number) => Promise.resolve(roleId === 1 ? [roleEvent] : []));
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(screen.getByRole("button", { name: /Family Member/ }));
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      expect(await screen.findByText("No Events for this Role.")).toBeInTheDocument();
      await act(async () => pending.resolve(roleEvent));
      expect(screen.getByText(gate)).toBeInTheDocument();
      expect(screen.queryByText("SERVICE_USER #99")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Architecture review/ })).not.toBeInTheDocument();
    });
  });
});
