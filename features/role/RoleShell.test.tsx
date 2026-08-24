import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  cancelRoleEventApi: vi.fn(),
  completeRoleEventApi: vi.fn(),
  createPersonApi: vi.fn(),
  createRoleEventApi: vi.fn(),
  createRoleRelationApi: vi.fn(),
  getRoleEventApi: vi.fn(),
  listPersonsApi: vi.fn(),
  listRoleEventsApi: vi.fn(),
  listRoleRelationsApi: vi.fn(),
  updateRoleApi: vi.fn(),
  updateRoleEventApi: vi.fn(),
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
    vi.clearAllMocks();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    api.listPersonsApi.mockResolvedValue([person]);
    api.listRoleRelationsApi.mockResolvedValue([relation]);
    api.listRoleEventsApi.mockResolvedValue([roleEvent]);
    api.getRoleEventApi.mockResolvedValue(roleEvent);
    api.createPersonApi.mockResolvedValue(person);
    api.createRoleRelationApi.mockResolvedValue(relation);
    api.updateRoleRelationApi.mockResolvedValue({ ...relation, relationType: "MENTOR" });
    api.createRoleEventApi.mockResolvedValue(roleEvent);
    api.updateRoleEventApi.mockResolvedValue({ ...roleEvent, title: "Updated review" });
    api.completeRoleEventApi.mockResolvedValue({ ...roleEvent, status: "COMPLETED", completedAt: "2026-08-11T00:00:00Z" });
    api.cancelRoleEventApi.mockResolvedValue({ ...roleEvent, status: "CANCELED" });
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

  describe("Events surface에서 일정 lifecycle을 수행하면", () => {
    it("list/detail/participant 표시 후 create/update/complete를 수행하되 participant 입력은 노출하지 않는다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));

      expect(await screen.findByText("SERVICE_USER #99")).toBeInTheDocument();
      expect(screen.queryByLabelText(/participant/i)).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Create Event" }));
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Planning" } });
      fireEvent.click(screen.getByRole("button", { name: "Save New Event" }));
      await waitFor(() => expect(api.createRoleEventApi).toHaveBeenCalledWith(1, { title: "Planning", description: null, startsAt: null, endsAt: null }));

      fireEvent.click(screen.getByRole("button", { name: "Edit Event" }));
      fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated review" } });
      fireEvent.click(screen.getByRole("button", { name: "Update Event" }));
      await waitFor(() => expect(api.updateRoleEventApi).toHaveBeenCalledWith(1, 11, { title: "Updated review", description: "Review boundaries", startsAt: null, endsAt: null }));

      fireEvent.click(screen.getByRole("button", { name: "Complete Event" }));
      await waitFor(() => expect(api.completeRoleEventApi).toHaveBeenCalledWith(1, 11));
    });

    it("cancel은 독립 endpoint만 호출하고 LifeLog 또는 participant mutation을 만들지 않는다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: /Events/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Cancel Event" }));

      await waitFor(() => expect(api.cancelRoleEventApi).toHaveBeenCalledWith(1, 11));
      expect(api.createRoleEventApi).not.toHaveBeenCalled();
      expect(api.updateRoleEventApi).not.toHaveBeenCalled();
      expect(api.completeRoleEventApi).not.toHaveBeenCalled();
    });
  });
});
