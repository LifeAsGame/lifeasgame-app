import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonDetail, RoleDetail, RoleEventDetail, RoleRelationDetail } from "@/shared/api/types";
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
const router = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("./api", () => api);
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/shared/ui/PanelCard", () => ({
  default: ({ label, onClick, actions, onAction }: {
    label: string;
    onClick?: () => void;
    actions?: Array<{ type: string; label: string }>;
    onAction?: (type: string) => void;
  }) => (
    <div>
      <button type="button" onClick={onClick}>{label}</button>
      {actions?.map((action) => <button key={action.type} type="button" onClick={() => onAction?.(action.type)}>{action.label} {label}</button>)}
    </div>
  ),
}));

const roles: RoleDetail[] = [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
  { id: 2, roleType: "FAMILY", name: "Family Member", description: "Be present", status: "ACTIVE", createdAt: "2026-01-02T00:00:00Z", updatedAt: "2026-01-02T00:00:00Z", version: 0 },
];
const person: PersonDetail = { id: 7, linkedUserId: 44, displayName: "Alex", notes: null, birthday: null, contact: null, status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const relation: RoleRelationDetail = { id: 9, personId: 7, personDisplayName: "Alex", linkedUserId: 44, relationType: "FRIEND", roleNotes: "Call monthly", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };
const roleEvent: RoleEventDetail = { id: 11, roleId: 1, title: "Architecture review", description: "Review boundaries", startsAt: null, endsAt: null, status: "PLANNED", completedAt: null, participants: [{ participantLinkId: 1, participantType: "SERVICE_USER", participantId: 99 }], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 };

function Harness({ initialRoleId = 1, availableRoles = roles, loading = false, error = null, refresh = vi.fn().mockResolvedValue(undefined) }: { initialRoleId?: number | null; availableRoles?: RoleDetail[]; loading?: boolean; error?: string | null; refresh?: () => Promise<void> }) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(initialRoleId);
  return <RoleShell roles={availableRoles} selectedRoleId={selectedRoleId} isLoading={loading} error={error} onSelectRole={setSelectedRoleId} onRefresh={refresh} />;
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

  describe("Role 목록을 탐색하고 관리하면", () => {
    it("loading/empty/error 상태를 표시하고 선택·create·edit·archive 흐름을 제공한다", async () => {
      const refresh = vi.fn().mockResolvedValue(undefined);
      const { rerender } = render(<Harness loading availableRoles={[]} initialRoleId={null} refresh={refresh} />);
      expect(screen.getByText("Loading Roles...")).toBeInTheDocument();

      rerender(<Harness availableRoles={[]} initialRoleId={null} error="Role load failed" refresh={refresh} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Role load failed");

      rerender(<Harness availableRoles={[]} initialRoleId={null} refresh={refresh} />);
      expect(screen.getByText(/No Roles yet/)).toBeInTheDocument();

      rerender(<Harness refresh={refresh} />);
      fireEvent.click(screen.getByRole("button", { name: "Family Member" }));
      expect(screen.getByText("Be present")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Create Role" }));
      expect(router.push).toHaveBeenCalledWith("/roles/create");

      fireEvent.click(screen.getByRole("button", { name: "Edit Family Member" }));
      fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Family Anchor" } });
      fireEvent.click(screen.getByRole("button", { name: "Save Role" }));
      await waitFor(() => expect(api.updateRoleApi).toHaveBeenCalledWith(2, { roleType: "FAMILY", name: "Family Anchor", description: "Be present" }));

      fireEvent.click(screen.getByRole("button", { name: "Archive Family Member" }));
      await waitFor(() => expect(api.archiveRoleApi).toHaveBeenCalledWith(2));
      expect(refresh).toHaveBeenCalled();
    });
  });

  describe("Role을 선택하지 않은 상태이면", () => {
    it("Relation/Event 하위 API를 호출하지 않고 선택 guard를 표시한다", () => {
      render(<Harness initialRoleId={null} availableRoles={[]} />);

      expect(screen.getAllByText(/Select a Role/).length).toBeGreaterThan(0);
      expect(api.listPersonsApi).not.toHaveBeenCalled();
      expect(api.listRoleRelationsApi).not.toHaveBeenCalled();
      expect(api.listRoleEventsApi).not.toHaveBeenCalled();
    });
  });

  describe("Relations surface에서 Person과 관계를 관리하면", () => {
    it("Person을 별도 identity로 생성·선택하고 Relation을 create/update/archive한다", async () => {
      render(<Harness />);
      fireEvent.click(screen.getByRole("button", { name: "Relations" }));

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
      fireEvent.click(screen.getByRole("button", { name: "Events" }));
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
      fireEvent.click(screen.getByRole("button", { name: "Events" }));
      fireEvent.click(await screen.findByRole("button", { name: /Architecture review/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Cancel Event" }));

      await waitFor(() => expect(api.cancelRoleEventApi).toHaveBeenCalledWith(1, 11));
      expect(api.createRoleEventApi).not.toHaveBeenCalledWith(expect.objectContaining({ lifeLog: expect.anything() }));
    });
  });
});
