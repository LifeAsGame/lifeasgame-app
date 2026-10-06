import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import GuildEventPanels from "./GuildEventPanels";

const groups = vi.hoisted(() => ({ groupMe: vi.fn() }));
const events = vi.hoisted(() => ({ guildEvent: vi.fn(), guildEvents: vi.fn(), guildEventParticipants: vi.fn(), guildEventRsvp: vi.fn(), cancelGuildEventRsvp: vi.fn(), finishGuildEvent: vi.fn(), updateGuildEvent: vi.fn(), createGuildEvent: vi.fn() }));
vi.mock("./groups", () => groups);
vi.mock("./guildInsideApi", () => events);

const item = { id: 9, guildId: 7, title: "길드 원본 행사", sharedDescription: null, startsAt: "2026-10-11T00:00:00Z", endsAt: "2026-10-11T01:00:00Z", location: null, status: "PLANNED", createdByPlayerId: 4, participantCount: 0, myRsvp: false, createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z" };
const props = { guildId: 7, selectedEventId: 9, detailOnly: true, creating: false, onBack: vi.fn(), onChanged: vi.fn(), onAccessLost: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  groups.groupMe.mockResolvedValue({ myRole: "MEMBER" });
  events.guildEvent.mockResolvedValue(item);
  events.guildEvents.mockResolvedValue({ contents: [item], page: 0, size: 20, totalElements: 1, totalPages: 1 });
  events.guildEventRsvp.mockResolvedValue({ ...item, myRsvp: true });
});

it("opens a regular member's original Guild detail and refreshes it after RSVP", async () => {
  render(<GuildEventPanels {...props} />);
  await screen.findByRole("heading", { name: "길드 원본 행사" });
  expect(screen.queryByRole("button", { name: "행사 수정" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "행사 완료" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "행사 취소" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "참가" }));
  await waitFor(() => expect(events.guildEventRsvp).toHaveBeenCalledWith(7, 9));
  await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  expect(events.guildEvent).toHaveBeenCalledWith(7, 9);
});

it("rechecks leader rights on focus and removes the old edit action", async () => {
  groups.groupMe.mockResolvedValueOnce({ myRole: "LEADER" }).mockResolvedValue({ myRole: "MEMBER" });
  render(<GuildEventPanels {...props} />);
  expect(await screen.findByRole("button", { name: "행사 수정" })).toBeInTheDocument();
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(screen.queryByRole("button", { name: "행사 수정" })).not.toBeInTheDocument());
  expect(events.updateGuildEvent).not.toHaveBeenCalled();
});

it("sends a leader's edit to the Guild original and refreshes the combined list", async () => {
  groups.groupMe.mockResolvedValue({ myRole: "LEADER" });
  events.updateGuildEvent.mockResolvedValue({ ...item, title: "수정된 원본 행사" });
  render(<GuildEventPanels {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "행사 수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "행사 제목" }), { target: { value: "수정된 원본 행사" } });
  fireEvent.click(screen.getByRole("button", { name: "행사 저장" }));
  await waitFor(() => expect(events.updateGuildEvent).toHaveBeenCalledWith(7, 9, expect.objectContaining({ title: "수정된 원본 행사" })));
  await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
});

it("evicts private detail when the original Guild access fails", async () => {
  render(<GuildEventPanels {...props} />);
  await screen.findByRole("heading", { name: "길드 원본 행사" });
  events.guildEvent.mockRejectedValueOnce(new ApiError(404, "SOC-404-GUILD-NOT-FOUND", "접근 불가"));
  fireEvent(window, new Event("focus"));
  await waitFor(() => expect(props.onAccessLost).toHaveBeenCalled());
  expect(screen.queryByRole("heading", { name: "길드 원본 행사" })).not.toBeInTheDocument();
});
