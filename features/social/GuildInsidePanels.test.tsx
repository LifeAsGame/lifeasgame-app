import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import GuildGroupPanels from "./GuildGroupPanels";
import GuildEventPanels from "./GuildEventPanels";

const groups = vi.hoisted(() => ({ groupCreate: vi.fn(), groupMe: vi.fn(), groupMine: vi.fn() }));
const guild = vi.hoisted(() => ({ guildLinks: vi.fn(), guildPendingLinks: vi.fn(), proposeGuildLink: vi.fn(), createGuildGroup: vi.fn(), decideGuildLink: vi.fn(), guildEvents: vi.fn(), guildEvent: vi.fn(), guildEventRsvp: vi.fn() }));
const roles = vi.hoisted(() => ({ myRoleParties: vi.fn(), rolePartyDetail: vi.fn() }));
const roleApi = vi.hoisted(() => ({ listRolesApi: vi.fn() }));
const contextApi = vi.hoisted(() => ({ linkRoleGroup: vi.fn() }));
vi.mock("./groups", () => groups);
vi.mock("./guildInsideApi", () => guild);
vi.mock("@/features/role/roleParties", () => roles);
vi.mock("@/features/role/api", () => roleApi);
vi.mock("@/features/role/contextApi", () => contextApi);
const empty = { contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  groups.groupMe.mockResolvedValue({ myRole: "LEADER", actions: [] });
  groups.groupMine.mockResolvedValue(empty);
  roles.myRoleParties.mockResolvedValue(empty);
  roleApi.listRolesApi.mockResolvedValue([{ id: 5, name: "기록 역할", status: "ACTIVE" }]);
  contextApi.linkRoleGroup.mockResolvedValue({});
  guild.guildLinks.mockResolvedValue(empty);
  guild.guildPendingLinks.mockResolvedValue(empty);
  guild.guildEvents.mockResolvedValue(empty);
});

it("shows the Guild label while a nonmember's RoleParty detail stays private", async () => {
  guild.guildLinks.mockResolvedValue({ ...empty, contents: [{ id: 9, groupType: "ROLE_PARTY", groupId: 42, displayName: "공개 별칭", status: "ACTIVE", entryAction: "INVITE_REQUIRED" }], totalElements: 1, totalPages: 1 });
  roles.rolePartyDetail.mockRejectedValue(new Error("404"));
  render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /공개 별칭/ }));
  expect(await screen.findByText(/멤버 초대가 필요합니다/)).toBeInTheDocument();
  expect(roles.rolePartyDetail).toHaveBeenCalledWith(42);
  expect(screen.queryByText("비공개 이름")).not.toBeInTheDocument();
});

it("refreshes the pending list after consecutive proposals on the same tab", async () => {
  const pending: { id: number; groupType: string; groupId: number; displayName: string; status: string }[] = [];
  groups.groupMine.mockResolvedValue({ ...empty, contents: [{ id: 41, name: "첫 파티", myRole: "LEADER", status: "ACTIVE" }, { id: 42, name: "둘째 파티", myRole: "LEADER", status: "ACTIVE" }] });
  guild.guildPendingLinks.mockImplementation(async () => ({ ...empty, contents: [...pending], totalElements: pending.length, totalPages: 1 }));
  guild.proposeGuildLink.mockImplementation(async (_guildId, groupType, groupId, displayName) => {
    const link = { id: pending.length + 1, groupType, groupId, displayName, status: "PENDING" };
    pending.unshift(link); return link;
  });
  const view = render(<GuildGroupPanels guildId={3} playerId={7} creating onBack={() => {}} />);
  const submit = async (groupId: string, name: string) => {
    fireEvent.change(screen.getByRole("combobox", { name: "모임 방식" }), { target: { value: "EXISTING_PARTY" } });
    fireEvent.change(await screen.findByRole("combobox", { name: "내가 리더인 모임" }), { target: { value: groupId } });
    fireEvent.change(screen.getByRole("textbox", { name: "길드 멤버에게 보일 별도 이름" }), { target: { value: name } });
    fireEvent.click(screen.getByRole("button", { name: "기존 모임 연결 제안" }));
    expect(await screen.findByRole("button", { name: new RegExp(name) })).toBeInTheDocument();
  };
  await submit("41", "첫 공개 이름");
  view.rerender(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  view.rerender(<GuildGroupPanels guildId={3} playerId={7} creating onBack={() => {}} />);
  await submit("42", "둘째 공개 이름");
  expect(guild.guildPendingLinks).toHaveBeenLastCalledWith(3, 0);
});

it("ignores a late page response after a new proposal returns to page zero", async () => {
  let finishPageOne!: (value: typeof empty) => void;
  const oldPage = new Promise<typeof empty>((resolve) => { finishPageOne = resolve; });
  let proposed = false;
  groups.groupMine.mockResolvedValue({ ...empty, contents: [{ id: 41, name: "첫 파티", myRole: "LEADER", status: "ACTIVE" }] });
  guild.guildPendingLinks.mockImplementation(async (_guildId, page) => page === 1 ? oldPage : { ...empty, contents: proposed ? [{ id: 9, groupType: "PARTY", groupId: 41, displayName: "새 공개 이름", status: "PENDING" }] : [], totalPages: 2 });
  guild.proposeGuildLink.mockImplementation(async () => { proposed = true; return { id: 9, status: "PENDING" }; });
  const view = render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "대기 연결" }));
  fireEvent.click(await screen.findByRole("button", { name: "다음" }));
  await waitFor(() => expect(guild.guildPendingLinks).toHaveBeenCalledWith(3, 1));
  view.rerender(<GuildGroupPanels guildId={3} playerId={7} creating onBack={() => {}} />);
  fireEvent.change(screen.getByRole("combobox", { name: "모임 방식" }), { target: { value: "EXISTING_PARTY" } });
  fireEvent.change(await screen.findByRole("combobox", { name: "내가 리더인 모임" }), { target: { value: "41" } });
  fireEvent.change(screen.getByRole("textbox", { name: "길드 멤버에게 보일 별도 이름" }), { target: { value: "새 공개 이름" } });
  fireEvent.click(screen.getByRole("button", { name: "기존 모임 연결 제안" }));
  expect(await screen.findByRole("button", { name: /새 공개 이름/ })).toBeInTheDocument();
  await act(async () => finishPageOne({ ...empty, contents: [], totalPages: 2 }));
  expect(screen.getByRole("button", { name: /새 공개 이름/ })).toBeInTheDocument();
});

it("approves only the proposed name and stays pending when the server does", async () => {
  const link = { id: 9, groupType: "PARTY", groupId: 42, displayName: "제안한 이름", status: "PENDING", proposedByPlayerId: 8, guildLeaderApproved: false, groupLeaderApproved: true };
  guild.guildPendingLinks.mockResolvedValue({ ...empty, contents: [link], totalElements: 1, totalPages: 1 });
  guild.decideGuildLink.mockResolvedValue({ ...link, guildLeaderApproved: true });
  render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "대기 연결" }));
  fireEvent.click(await screen.findByRole("button", { name: /제안한 이름/ }));
  expect(await screen.findByText(/승인할 길드 공개 이름:/)).toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: /승인할 길드 공개 이름/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "연결 승인" }));
  await waitFor(() => expect(guild.decideGuildLink).toHaveBeenCalledWith(3, 9, "approve", "제안한 이름"));
  await waitFor(() => expect(screen.getByRole("button", { name: "대기 연결" })).toHaveAttribute("aria-pressed", "true"));
});

it("removes stale RoleParty approval after a conflict and leader transfer", async () => {
  const link = { id: 9, groupType: "ROLE_PARTY", groupId: 42, displayName: "공개 이름", status: "PENDING", proposedByPlayerId: 8, guildLeaderApproved: true, groupLeaderApproved: false };
  groups.groupMe.mockResolvedValue({ myRole: "MEMBER" });
  roles.rolePartyDetail.mockResolvedValueOnce({ leaderPlayerId: 7 }).mockResolvedValueOnce({ leaderPlayerId: 7 }).mockResolvedValue({ leaderPlayerId: 8 });
  guild.guildPendingLinks.mockResolvedValue({ ...empty, contents: [link], totalElements: 1, totalPages: 1 });
  guild.decideGuildLink.mockRejectedValue(new ApiError(409, "SOC-409-GUILD-GROUP-CONFLICT", "상태가 바뀌었습니다."));
  render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "대기 연결" }));
  fireEvent.click(await screen.findByRole("button", { name: /공개 이름/ }));
  fireEvent.click(await screen.findByRole("button", { name: "연결 승인" }));
  await waitFor(() => expect(guild.decideGuildLink).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(screen.queryByRole("button", { name: "연결 승인" })).not.toBeInTheDocument());
  expect(roles.rolePartyDetail).toHaveBeenCalledTimes(3);
});

it("reloads an active link when approval races with another leader", async () => {
  const pending = { id: 9, groupType: "PARTY", groupId: 42, displayName: "공개 이름", status: "PENDING", proposedByPlayerId: 8, guildLeaderApproved: false, groupLeaderApproved: true };
  guild.guildPendingLinks.mockResolvedValueOnce({ ...empty, contents: [pending], totalPages: 1 }).mockResolvedValue({ ...empty });
  guild.guildLinks.mockResolvedValue({ ...empty, contents: [{ ...pending, status: "ACTIVE", entryAction: "INVITE_REQUIRED" }], totalPages: 1 });
  guild.decideGuildLink.mockRejectedValue(new ApiError(409, "SOC-409-GUILD-GROUP-CONFLICT", "상태가 바뀌었습니다."));
  render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "대기 연결" }));
  fireEvent.click(await screen.findByRole("button", { name: /공개 이름/ }));
  fireEvent.click(await screen.findByRole("button", { name: "연결 승인" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "연결된 모임" })).toHaveAttribute("aria-pressed", "true"));
  expect(screen.getAllByText("일반 파티 · 연결됨").length).toBeGreaterThan(0);
});

it("hides management actions after the server rejects stale authority", async () => {
  const pending = { id: 9, groupType: "PARTY", groupId: 42, displayName: "공개 이름", status: "PENDING", proposedByPlayerId: 8, guildLeaderApproved: false, groupLeaderApproved: true };
  guild.guildPendingLinks.mockResolvedValue({ ...empty, contents: [pending], totalPages: 1 });
  guild.decideGuildLink.mockRejectedValue(new ApiError(403, "SOC-403-LEADER-ONLY", "권한이 없습니다."));
  render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(screen.getByRole("button", { name: "대기 연결" }));
  fireEvent.click(await screen.findByRole("button", { name: /공개 이름/ }));
  fireEvent.click(await screen.findByRole("button", { name: "연결 승인" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("현재 리더 권한이 없습니다.");
  expect(screen.queryByRole("button", { name: "연결 승인" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "제안 거절" })).not.toBeInTheDocument();
});

it("retries atomic Guild Party creation with the same request key and payload", async () => {
  guild.createGuildGroup.mockRejectedValueOnce(new Error("temporary network failure")).mockResolvedValueOnce({ groupType: "PARTY", groupId: 42, linkId: 9, linkStatus: "PENDING", capabilities: { canOpenGroup: true, canApproveGuildLink: false, canLinkToPersonalRole: false } });
  render(<GuildGroupPanels guildId={3} playerId={7} creating onBack={() => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "파티 이름" }), { target: { value: "비공개 파티" } });
  fireEvent.change(screen.getByRole("textbox", { name: "파티 코드" }), { target: { value: "private-party" } });
  fireEvent.change(screen.getByRole("textbox", { name: "길드 멤버에게 보일 별도 이름" }), { target: { value: "길드 공부 모임" } });
  fireEvent.click(screen.getByRole("button", { name: "길드에서 모임 만들기" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("temporary network failure");
  fireEvent.click(screen.getByRole("button", { name: "길드에서 모임 만들기" }));
  await waitFor(() => expect(guild.createGuildGroup).toHaveBeenCalledTimes(2));
  expect(guild.createGuildGroup.mock.calls[0]).toEqual(guild.createGuildGroup.mock.calls[1]);
  expect(guild.proposeGuildLink).not.toHaveBeenCalled();
});

it("retries only the personal Role link after a RoleParty was created", async () => {
  guild.createGuildGroup.mockResolvedValue({ groupType: "ROLE_PARTY", groupId: 42, linkId: 9, linkStatus: "PENDING", capabilities: { canOpenGroup: true, canApproveGuildLink: false, canLinkToPersonalRole: true } });
  contextApi.linkRoleGroup.mockRejectedValueOnce(new Error("temporary link failure")).mockResolvedValueOnce({});
  render(<GuildGroupPanels guildId={3} playerId={7} creating onBack={() => {}} />);
  fireEvent.change(screen.getByRole("combobox", { name: "모임 방식" }), { target: { value: "NEW_ROLE_PARTY" } });
  fireEvent.change(await screen.findByRole("combobox", { name: "내 활성 역할" }), { target: { value: "5" } });
  fireEvent.change(screen.getByRole("textbox", { name: "소모임 이름" }), { target: { value: "역할 소모임" } });
  fireEvent.change(screen.getByRole("textbox", { name: "길드 멤버에게 보일 별도 이름" }), { target: { value: "공유 이름" } });
  fireEvent.click(screen.getByRole("button", { name: "길드에서 모임 만들기" }));
  expect(await screen.findByText(/모임 생성은 완료됐습니다/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "내 역할 연결 다시 시도" }));
  await waitFor(() => expect(contextApi.linkRoleGroup).toHaveBeenCalledTimes(2));
  expect(contextApi.linkRoleGroup).toHaveBeenLastCalledWith(5, { groupType: "ROLE_PARTY", groupId: 42 });
  expect(guild.createGuildGroup).toHaveBeenCalledTimes(1);
});

it("reloads persisted RSVP after joining and remounting", async () => {
  const event = { id: 5, guildId: 3, title: "공유 행사", sharedDescription: null, startsAt: "2026-10-03T01:00:00Z", endsAt: "2026-10-03T02:00:00Z", location: null, status: "PLANNED", createdByPlayerId: 7, participantCount: 0, myRsvp: false, createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" };
  guild.guildEvents.mockResolvedValue({ ...empty, contents: [event], totalElements: 1, totalPages: 1 });
  guild.guildEvent.mockImplementation(async () => ({ ...event, myRsvp: guild.guildEventRsvp.mock.calls.length > 0 }));
  guild.guildEventRsvp.mockResolvedValue({ ...event, myRsvp: true });
  const first = render(<GuildEventPanels guildId={3} creating={false} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /공유 행사/ }));
  fireEvent.click(await screen.findByRole("button", { name: "참가" }));
  expect(await screen.findByRole("button", { name: "참가 취소" })).toBeInTheDocument();
  first.unmount();
  render(<GuildEventPanels guildId={3} creating={false} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /공유 행사/ }));
  expect(await screen.findByRole("button", { name: "참가 취소" })).toBeInTheDocument();
});
