import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import RosterPanels from "./RosterPanels";
import RosterInvitationPanels from "./RosterInvitationPanels";

const api = vi.hoisted(() => ({ rosterRows: vi.fn(), createRosterRow: vi.fn(), updateRosterRow: vi.fn(), deleteRosterRow: vi.fn(), inviteRosterRow: vi.fn(), pendingRosterInvitations: vi.fn(), cancelRosterInvitation: vi.fn(), myRosterInvitations: vi.fn(), answerRosterInvitation: vi.fn() }));
const groups = vi.hoisted(() => ({ groupMembers: vi.fn(), groupMine: vi.fn() }));
const social = vi.hoisted(() => ({ getFollowersApi: vi.fn(), getFollowingsApi: vi.fn() }));
vi.mock("./rosterApi", () => api);
vi.mock("./groups", () => groups);
vi.mock("./api", () => social);
const page = <T,>(contents: T[]) => ({ contents, page: 0, size: 20, totalElements: contents.length, totalPages: contents.length ? 1 : 0 });
const row = { rosterEntryId: 11, groupType: "GUILD", groupId: 3, displayName: "오프라인 멤버", groupRoleLabel: "기록 담당", version: 0, status: "UNLINKED", linkedPlayerId: null, memberStatus: null };
const writable = { ...page([row]), capabilities: { canManageRoster: true, canInvite: true } };

beforeEach(() => {
  vi.resetAllMocks();
  api.rosterRows.mockResolvedValue(writable);
  api.pendingRosterInvitations.mockResolvedValue(page([]));
  groups.groupMembers.mockResolvedValue({ ...page([{ playerId: 7, role: "LEADER" }]), totalElements: 1 });
  groups.groupMine.mockResolvedValue(page([]));
  social.getFollowersApi.mockResolvedValue(page([{ followedBack: true, peer: { playerId: 8, name: "대상 계정" } }]));
  social.getFollowingsApi.mockResolvedValue(page([]));
});

it("uses empty-list capabilities to register an offline entry without adding a service member", async () => {
  api.rosterRows.mockResolvedValue({ ...page([]), capabilities: writable.capabilities });
  api.createRosterRow.mockResolvedValue(row);
  render(<RosterPanels groupType="GUILD" groupId={3} maxMembers={10} creating onBack={vi.fn()} />);
  await screen.findByText(/실제 가입 1\/10명/);
  fireEvent.change(screen.getByRole("textbox", { name: "공유 이름" }), { target: { value: "오프라인 멤버" } });
  fireEvent.change(screen.getByRole("textbox", { name: "모임 내 역할·소개" }), { target: { value: "기록 담당" } });
  expect(screen.getByRole("textbox", { name: "공유 이름" })).toHaveValue("오프라인 멤버");
  fireEvent.click(screen.getByRole("button", { name: "명부 등록" }));
  await waitFor(() => expect(api.createRosterRow).toHaveBeenCalledWith("GUILD", 3, { displayName: "오프라인 멤버", groupRoleLabel: "기록 담당" }));
  expect(groups.groupMembers).toHaveBeenCalledWith("guilds", 3, 0);
  expect(screen.getByText(/실제 가입 1\/10명/)).toBeInTheDocument();
  expect(screen.getByText(/계정 미연결 명부 0건/)).toBeInTheDocument();
  expect(api.rosterRows).toHaveBeenCalledWith("GUILD", 3, 0, "UNLINKED");
});

it("keeps an empty roster read-only when the server withholds management capability", async () => {
  api.rosterRows.mockResolvedValue({ ...page([]), capabilities: { canManageRoster: false, canInvite: false } });
  render(<RosterPanels groupType="PARTY" groupId={3} maxMembers={10} creating onBack={vi.fn()} />);
  expect(await screen.findByText("명부 항목이 없습니다.")).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "공유 이름" })).not.toBeInTheDocument();
  expect(api.pendingRosterInvitations).not.toHaveBeenCalled();
});

it("keeps a stale edit draft and offers the latest version", async () => {
  api.updateRosterRow.mockRejectedValue(new ApiError(409, "CONFLICT", "stale"));
  render(<RosterPanels groupType="GUILD" groupId={3} maxMembers={10} creating={false} onBack={vi.fn()} />);
  const entry = await screen.findByRole("button", { name: /오프라인 멤버/ });
  fireEvent.keyDown(entry, { key: "F10", shiftKey: true });
  fireEvent.click(screen.getByRole("button", { name: "수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "공유 이름" }), { target: { value: "수정한 이름" } });
  fireEvent.click(screen.getByRole("button", { name: "명부 수정 저장" }));
  await waitFor(() => expect(api.updateRosterRow).toHaveBeenCalledWith("GUILD", 3, 11, { displayName: "수정한 이름", groupRoleLabel: "기록 담당", version: 0 }));
  expect(screen.getByRole("textbox", { name: "공유 이름" })).toHaveValue("수정한 이름");
  expect(screen.getByRole("button", { name: "최신 조회" })).toBeInTheDocument();
});

it("sends a roster invitation only after confirming an exact allowed account", async () => {
  api.inviteRosterRow.mockResolvedValue({ invitationId: 4 });
  render(<RosterPanels groupType="GUILD" groupId={3} maxMembers={10} creating={false} onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /오프라인 멤버/ }));
  fireEvent.click(await screen.findByRole("button", { name: "연결 초대" }));
  fireEvent.change(await screen.findByRole("combobox", { name: "연결할 실제 계정" }), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "연결 초대 전송" }));
  const dialog = await screen.findByRole("dialog", { name: "작업 확인" });
  expect(dialog).toHaveTextContent("대상 계정");
  expect(dialog).toHaveTextContent("오프라인 멤버");
  fireEvent.click(within(dialog).getByRole("button", { name: "확인" }));
  await waitFor(() => expect(api.inviteRosterRow).toHaveBeenCalledWith("GUILD", 3, 11, 8));
});

it("accepts by the single atomic roster endpoint after showing the membership effect", async () => {
  const invitation = { invitationId: 4, groupType: "GUILD", groupId: 3, groupName: "산책 길드", rosterEntryId: 11, rosterDisplayName: "오프라인 멤버", expiresAt: "2099-01-01T00:00:00Z", membershipWillBeCreated: true, status: "PENDING" };
  api.myRosterInvitations.mockResolvedValue(page([invitation]));
  api.answerRosterInvitation.mockResolvedValue({ ...row, status: "LINKED", linkedPlayerId: 8, memberStatus: "ACTIVE" });
  render(<RosterInvitationPanels onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /산책 길드/ }));
  expect(screen.getByText(/모임 가입과 명부 연결이 함께/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /수락/ }));
  fireEvent.click(within(await screen.findByRole("dialog", { name: "작업 확인" })).getByRole("button", { name: "확인" }));
  await waitFor(() => expect(api.answerRosterInvitation).toHaveBeenCalledExactlyOnceWith(4, "accept"));
  expect(groups.groupMembers).toHaveBeenCalledWith("guilds", 3, 0);
  expect(api.rosterRows).toHaveBeenCalledWith("GUILD", 3, 0);
});

it("does not report a capacity conflict as accepted and keeps the invitation available for a retry", async () => {
  const invitation = { invitationId: 4, groupType: "PARTY", groupId: 3, groupName: "주말 파티", rosterEntryId: 11, rosterDisplayName: "오프라인 멤버", expiresAt: "2099-01-01T00:00:00Z", membershipWillBeCreated: true, status: "PENDING" };
  api.myRosterInvitations.mockResolvedValue(page([invitation]));
  api.answerRosterInvitation.mockRejectedValue(new ApiError(409, "SOC-409-ROSTER-CONFLICT", "full"));
  render(<RosterInvitationPanels onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /주말 파티/ }));
  fireEvent.click(screen.getByRole("button", { name: /수락/ }));
  fireEvent.click(within(await screen.findByRole("dialog", { name: "작업 확인" })).getByRole("button", { name: "확인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("정원이 바뀌었습니다");
  expect(screen.getByRole("button", { name: /수락/ })).toBeInTheDocument();
  expect(api.answerRosterInvitation).toHaveBeenCalledExactlyOnceWith(4, "accept");
  expect(groups.groupMembers).not.toHaveBeenCalled();
});

it("closes a canceled invitation detail after a conflict and fresh empty list", async () => {
  const invitation = { invitationId: 4, groupType: "GUILD", groupId: 3, groupName: "산책 길드", rosterEntryId: 11, rosterDisplayName: "오프라인 멤버", expiresAt: "2099-01-01T00:00:00Z", membershipWillBeCreated: true, status: "PENDING" };
  api.myRosterInvitations.mockResolvedValueOnce(page([invitation])).mockResolvedValue(page([]));
  api.answerRosterInvitation.mockRejectedValue(new ApiError(409, "SOC-409-ROSTER-CONFLICT", "canceled"));
  render(<RosterInvitationPanels onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /산책 길드/ }));
  fireEvent.click(screen.getByRole("button", { name: /수락/ }));
  fireEvent.click(within(await screen.findByRole("dialog", { name: "작업 확인" })).getByRole("button", { name: "확인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("다시 조회해주세요");
  expect(screen.getByRole("heading", { name: "받은 명부 연결 초대" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /수락/ })).not.toBeInTheDocument();
});
