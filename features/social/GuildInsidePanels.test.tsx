import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import GuildGroupPanels from "./GuildGroupPanels";
import GuildEventPanels from "./GuildEventPanels";

const groups = vi.hoisted(() => ({ groupCreate: vi.fn(), groupMe: vi.fn(), groupMine: vi.fn() }));
const guild = vi.hoisted(() => ({ guildLinks: vi.fn(), guildPendingLinks: vi.fn(), proposeGuildLink: vi.fn(), guildEvents: vi.fn(), guildEvent: vi.fn(), guildEventRsvp: vi.fn() }));
const roles = vi.hoisted(() => ({ myRoleParties: vi.fn(), rolePartyDetail: vi.fn() }));
vi.mock("./groups", () => groups);
vi.mock("./guildInsideApi", () => guild);
vi.mock("@/features/role/roleParties", () => roles);
const empty = { contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 };

beforeEach(() => {
  vi.resetAllMocks();
  groups.groupMe.mockResolvedValue({ myRole: "LEADER", actions: [] });
  groups.groupMine.mockResolvedValue(empty);
  roles.myRoleParties.mockResolvedValue(empty);
  guild.guildLinks.mockResolvedValue(empty);
  guild.guildPendingLinks.mockResolvedValue(empty);
  guild.guildEvents.mockResolvedValue(empty);
});

it("shows the Guild label without querying private RoleParty detail for a nonmember", async () => {
  guild.guildLinks.mockResolvedValue({ ...empty, contents: [{ id: 9, groupType: "ROLE_PARTY", groupId: 42, displayName: "공개 별칭", status: "ACTIVE", entryAction: "INVITE_REQUIRED" }], totalElements: 1, totalPages: 1 });
  render(<GuildGroupPanels guildId={3} playerId={7} creating={false} onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /공개 별칭/ }));
  expect(await screen.findByText(/멤버 초대가 필요합니다/)).toBeInTheDocument();
  expect(roles.rolePartyDetail).not.toHaveBeenCalled();
});

it("retries linking a created Party without creating it again", async () => {
  groups.groupCreate.mockResolvedValue({ id: 42 });
  guild.proposeGuildLink.mockRejectedValueOnce(new Error("temporary link failure")).mockResolvedValueOnce({ id: 9 });
  render(<GuildGroupPanels guildId={3} playerId={7} creating onBack={() => {}} />);
  fireEvent.change(screen.getByRole("combobox", { name: "연결 방식" }), { target: { value: "NEW" } });
  fireEvent.change(screen.getByRole("textbox", { name: "파티 이름" }), { target: { value: "비공개 파티" } });
  fireEvent.change(screen.getByRole("textbox", { name: "파티 코드" }), { target: { value: "private-party" } });
  fireEvent.change(screen.getByRole("textbox", { name: "길드 멤버에게 보일 별도 이름" }), { target: { value: "길드 공부 모임" } });
  fireEvent.click(screen.getByRole("button", { name: "연결 제안" }));
  expect(await screen.findByText("파티 #42 생성 완료 · 연결만 다시 시도할 수 있습니다.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "연결 다시 시도" }));
  await waitFor(() => expect(guild.proposeGuildLink).toHaveBeenCalledTimes(2));
  expect(groups.groupCreate).toHaveBeenCalledTimes(1);
  expect(guild.proposeGuildLink).toHaveBeenLastCalledWith(3, "PARTY", 42, "길드 공부 모임");
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
