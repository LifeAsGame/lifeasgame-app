import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import RolePartyPanels from "./RolePartyPanels";

const api = vi.hoisted(() => ({ rolePartiesForRole: vi.fn(), createRoleParty: vi.fn(), rolePartyDetail: vi.fn(), myRoleParties: vi.fn(), myRolePartyInvitations: vi.fn(), rolePartyMembers: vi.fn(), rolePartyInvitations: vi.fn(), inviteToRoleParty: vi.fn(), cancelRolePartyInvitation: vi.fn(), answerRolePartyInvitation: vi.fn() }));
vi.mock("./roleParties", () => api);
const links = vi.hoisted(() => ({ linkRoleGroup: vi.fn() }));
vi.mock("./contextApi", () => ({ linkRoleGroup: links.linkRoleGroup }));
const roles = vi.hoisted(() => ({ listRolesApi: vi.fn(), createRoleApi: vi.fn() }));
vi.mock("./api", () => roles);
vi.mock("@/features/social/api", () => ({ getFollowersApi: vi.fn().mockResolvedValue({ contents: [], totalPages: 0 }) }));

const party = { id: 8, name: "동료 모임", description: "함께 공부", status: "ACTIVE", creatorPlayerId: 4, leaderPlayerId: 4, memberCount: 1, maxMembers: 5, members: [{ playerId: 4, role: "LEADER", joinedAt: "2026-10-02T00:00:00Z" }], createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" };

beforeEach(() => {
  vi.resetAllMocks();
  api.rolePartiesForRole.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.myRoleParties.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.createRoleParty.mockResolvedValue(party);
  api.rolePartyDetail.mockResolvedValue(party);
  api.rolePartyInvitations.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  links.linkRoleGroup.mockResolvedValue({ linkId: 2 });
  roles.listRolesApi.mockResolvedValue([{ id: 3, name: "동료", status: "ACTIVE", roleType: "CUSTOM", description: "검증" }, { id: 4, name: "지난 역할", status: "ARCHIVED", roleType: "CUSTOM", description: "검증" }]);
});

it("accepts an invitation and returns to the shared My Role Parties list", async () => {
  const invite = { invitationId: 12, rolePartyId: 8, groupName: party.name, inviterPlayerId: 4, inviteePlayerId: 7, status: "PENDING", expiresAt: "2026-10-09T00:00:00Z" };
  api.myRolePartyInvitations.mockResolvedValue({ contents: [invite], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  api.myRoleParties.mockResolvedValue({ contents: [{ group: party, membershipStatus: "ACTIVE" }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  api.answerRolePartyInvitation.mockResolvedValue(party);
  render(<RolePartyPanels playerId={7} onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "받은 초대" }));
  fireEvent.click(await screen.findByRole("button", { name: /동료 모임/ }));
  fireEvent.click(screen.getByRole("button", { name: "수락" }));
  await waitFor(() => expect(api.answerRolePartyInvitation).toHaveBeenCalledWith(8, 12, "accept"));
  expect(await screen.findByText("활동 중 · 1/5명")).toBeInTheDocument();
});

it("creates an invitation-only role party without a role event and opens its member detail", async () => {
  render(<RolePartyPanels roleId={3} roleName="동료" playerId={4} createRequest={1} onBack={() => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "이름" }), { target: { value: "동료 모임" } });
  fireEvent.change(screen.getByRole("textbox", { name: "설명" }), { target: { value: "함께 공부" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: /정원/ }), { target: { value: "5" } });
  fireEvent.click(screen.getByRole("button", { name: "소모임 생성" }));
  await waitFor(() => expect(api.createRoleParty).toHaveBeenCalledWith(3, { name: "동료 모임", description: "함께 공부", maxMembers: 5 }));
  expect(links.linkRoleGroup).toHaveBeenCalledWith(3, { groupType: "ROLE_PARTY", groupId: 8 });
  expect(await screen.findByText("1/5명")).toBeInTheDocument();
  expect(screen.getByText("초대 전용")).toBeInTheDocument();
});

it("retries only the bookmark when creation succeeded", async () => {
  links.linkRoleGroup.mockRejectedValueOnce(new Error("link failed")).mockResolvedValueOnce({ linkId: 2 });
  render(<RolePartyPanels roleId={3} roleName="동료" playerId={4} createRequest={1} onBack={() => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "이름" }), { target: { value: "동료 모임" } });
  fireEvent.click(screen.getByRole("button", { name: "소모임 생성" }));
  expect(await screen.findByRole("button", { name: "연결 다시 시도" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "연결 다시 시도" }));
  expect(await screen.findByText("1/5명")).toBeInTheDocument();
  expect(api.createRoleParty).toHaveBeenCalledTimes(1);
  expect(links.linkRoleGroup).toHaveBeenCalledTimes(2);
});

it("creates from the group menu using only an owned active Role", async () => {
  render(<RolePartyPanels playerId={4} createRequest={1} onBack={() => {}} />);
  const selector = await screen.findByRole("combobox", { name: "내 활성 역할" });
  expect(screen.queryByRole("option", { name: "지난 역할" })).not.toBeInTheDocument();
  fireEvent.change(selector, { target: { value: "3" } });
  fireEvent.change(screen.getByRole("textbox", { name: "이름" }), { target: { value: "동료 모임" } });
  fireEvent.click(screen.getByRole("button", { name: "소모임 생성" }));
  await waitFor(() => expect(api.createRoleParty).toHaveBeenCalledWith(3, expect.objectContaining({ name: "동료 모임" })));
  expect(links.linkRoleGroup).toHaveBeenCalledWith(3, { groupType: "ROLE_PARTY", groupId: 8 });
});

it("creates a Role within the group flow and selects it", async () => {
  const freshRole = { id: 19, name: "새 역할", status: "ACTIVE", roleType: "CUSTOM", description: "검증" };
  let created = false;
  roles.listRolesApi.mockImplementation(async () => created ? [freshRole] : []);
  roles.createRoleApi.mockImplementation(async () => { created = true; return freshRole; });
  render(<RolePartyPanels playerId={4} createRequest={1} onBack={() => {}} />);
  expect(await screen.findByRole("combobox", { name: "내 활성 역할" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "새 역할 만들기" }));
  fireEvent.change(screen.getByRole("textbox", { name: "직접 입력할 유형" }), { target: { value: "CUSTOM" } });
  fireEvent.change(screen.getByRole("textbox", { name: "역할 이름" }), { target: { value: "새 역할" } });
  fireEvent.change(screen.getByRole("textbox", { name: "역할 설명" }), { target: { value: "검증" } });
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  await waitFor(() => expect(screen.getByRole("combobox", { name: "내 활성 역할" })).toHaveValue("19"));
  expect(screen.getByRole("option", { name: "새 역할" })).toBeInTheDocument();
});

it("shows former membership history without opening protected detail", async () => {
  api.myRoleParties.mockResolvedValue({ contents: [{ group: party, membershipStatus: "LEFT" }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  render(<RolePartyPanels playerId={7} onBack={() => {}} />);
  expect(await screen.findByText("탈퇴 · 1/5명")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /동료 모임/ })).not.toBeInTheDocument();
  expect(api.rolePartyDetail).not.toHaveBeenCalled();
});

it("reloads leader pending invitations after reopening and cancels by the listed ID", async () => {
  const invite = { invitationId: 12, rolePartyId: 8, groupName: party.name, inviterPlayerId: 4, inviteePlayerId: 7, status: "PENDING", expiresAt: "2026-10-09T00:00:00Z" };
  api.rolePartiesForRole.mockResolvedValue({ contents: [party], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  const pendingInvites = { contents: [invite], page: 0, size: 20, totalElements: 1, totalPages: 1 };
  api.rolePartyInvitations.mockResolvedValueOnce(pendingInvites).mockResolvedValueOnce(pendingInvites).mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.cancelRolePartyInvitation.mockResolvedValue(undefined);
  const first = render(<RolePartyPanels roleId={3} playerId={4} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /동료 모임/ }));
  fireEvent.click(await screen.findByRole("button", { name: "초대" }));
  expect(await screen.findByRole("button", { name: "초대 취소" })).toBeInTheDocument();
  first.unmount();
  render(<RolePartyPanels roleId={3} playerId={4} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /동료 모임/ }));
  fireEvent.click(await screen.findByRole("button", { name: "초대" }));
  fireEvent.click(await screen.findByRole("button", { name: "초대 취소" }));
  await waitFor(() => expect(api.cancelRolePartyInvitation).toHaveBeenCalledWith(8, 12));
  expect(await screen.findByText("대기 초대가 없습니다.")).toBeInTheDocument();
});

it("does not report a successful cancellation as failed when detail refresh fails", async () => {
  const invite = { invitationId: 13, rolePartyId: 8, groupName: party.name, inviterPlayerId: 4, inviteePlayerId: 7, status: "PENDING", expiresAt: "2026-10-09T00:00:00Z" };
  api.rolePartiesForRole.mockResolvedValue({ contents: [party], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  api.rolePartyDetail.mockResolvedValueOnce(party).mockRejectedValueOnce(new Error("read unavailable"));
  api.rolePartyInvitations.mockResolvedValueOnce({ contents: [invite], page: 0, size: 20, totalElements: 1, totalPages: 1 }).mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.cancelRolePartyInvitation.mockResolvedValue(undefined);
  render(<RolePartyPanels roleId={3} playerId={4} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /동료 모임/ }));
  fireEvent.click(await screen.findByRole("button", { name: "초대" }));
  fireEvent.click(await screen.findByRole("button", { name: "초대 취소" }));
  expect(await screen.findByText(/작업은 완료됐지만 최신 정보를/)).toBeInTheDocument();
  expect(api.cancelRolePartyInvitation).toHaveBeenCalledTimes(1);
});

it("does not query leader invitations for a regular member", async () => {
  api.myRoleParties.mockResolvedValue({ contents: [{ group: party, membershipStatus: "ACTIVE" }], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  render(<RolePartyPanels playerId={7} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /동료 모임/ }));
  expect(await screen.findByText("멤버", { selector: "dd" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "초대" })).not.toBeInTheDocument();
  expect(api.rolePartyInvitations).not.toHaveBeenCalled();
});

it("reloads the role list on panel reentry", async () => {
  const { rerender } = render(<RolePartyPanels roleId={3} playerId={4} onBack={() => {}} />);
  await waitFor(() => expect(api.rolePartiesForRole).toHaveBeenCalledTimes(1));
  rerender(<RolePartyPanels roleId={3} playerId={4} reentryRequest={1} onBack={() => {}} />);
  await waitFor(() => expect(api.rolePartiesForRole).toHaveBeenCalledTimes(2));
});

it("opens the existing bookmarked RoleParty detail without the creator list and invalidates unavailable groups", async () => {
  const denied = vi.fn();
  api.rolePartyDetail.mockResolvedValue({ ...party, status: "DISBANDED" });
  render(<RolePartyPanels playerId={4} linkedGroup={{ id: 8, onAccessLost: denied }} onBack={vi.fn()} />);
  await waitFor(() => expect(denied).toHaveBeenCalledTimes(1));
  expect(api.myRoleParties).not.toHaveBeenCalled(); expect(api.rolePartiesForRole).not.toHaveBeenCalled();
  expect(screen.queryByText("함께 공부")).not.toBeInTheDocument();
});


it("evicts a bookmarked detail when invitation access is revoked", async () => {
  const denied = vi.fn();
  api.rolePartyInvitations.mockRejectedValue(new ApiError(404, "NOT_FOUND", "denied"));
  render(<RolePartyPanels playerId={4} linkedGroup={{ id: 8, onAccessLost: denied }} onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "초대" }));
  await waitFor(() => expect(denied).toHaveBeenCalledTimes(1));
});

it("evicts a bookmarked detail if the read after a successful command loses access", async () => {
  const denied = vi.fn();
  api.rolePartyDetail.mockResolvedValueOnce(party).mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", "denied"));
  api.rolePartyInvitations.mockResolvedValue({ contents: [{ invitationId: 13, inviteePlayerId: 7, expiresAt: "2026-10-09T00:00:00Z" }], page: 0, totalPages: 1 });
  api.cancelRolePartyInvitation.mockResolvedValue(undefined);
  render(<RolePartyPanels playerId={4} linkedGroup={{ id: 8, onAccessLost: denied }} onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: "초대" }));
  fireEvent.click(await screen.findByRole("button", { name: "초대 취소" }));
  await waitFor(() => expect(denied).toHaveBeenCalledTimes(1));
  expect(api.cancelRolePartyInvitation).toHaveBeenCalledTimes(1);
});
