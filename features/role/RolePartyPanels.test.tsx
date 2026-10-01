import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import RolePartyPanels from "./RolePartyPanels";

const api = vi.hoisted(() => ({ rolePartiesForRole: vi.fn(), createRoleParty: vi.fn(), rolePartyDetail: vi.fn(), myRoleParties: vi.fn(), myRolePartyInvitations: vi.fn(), rolePartyMembers: vi.fn() }));
vi.mock("./roleParties", () => api);

const party = { id: 8, name: "동료 모임", description: "함께 공부", status: "ACTIVE", creatorPlayerId: 4, leaderPlayerId: 4, memberCount: 1, maxMembers: 5, members: [{ playerId: 4, role: "LEADER", joinedAt: "2026-10-02T00:00:00Z" }], createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" };

beforeEach(() => {
  vi.resetAllMocks();
  api.rolePartiesForRole.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.createRoleParty.mockResolvedValue(party);
  api.rolePartyDetail.mockResolvedValue(party);
});

it("creates an invitation-only role party without a role event and opens its member detail", async () => {
  render(<RolePartyPanels roleId={3} roleName="동료" playerId={4} createRequest={1} onBack={() => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "이름" }), { target: { value: "동료 모임" } });
  fireEvent.change(screen.getByRole("textbox", { name: "설명" }), { target: { value: "함께 공부" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /정원/ }), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "소모임 생성" }));
  await waitFor(() => expect(api.createRoleParty).toHaveBeenCalledWith(3, { name: "동료 모임", description: "함께 공부", maxMembers: 5 }));
  expect(await screen.findByText("1/5명")).toBeInTheDocument();
  expect(screen.getByText("초대 전용")).toBeInTheDocument();
});
