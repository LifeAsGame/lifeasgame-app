import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import RoleEventPanels from "./RoleEventPanels";
import type { ScheduleRow } from "./scheduleApi";

const schedule = vi.hoisted(() => ({ roleSchedule: vi.fn() }));
const api = vi.hoisted(() => ({ listPersonsApi: vi.fn(), getRoleEventApi: vi.fn(), createRoleEventApi: vi.fn(), updateRoleEventApi: vi.fn(), completeRoleEventApi: vi.fn(), cancelRoleEventApi: vi.fn(), addRoleEventParticipantApi: vi.fn(), removeRoleEventParticipantApi: vi.fn() }));
vi.mock("./scheduleApi", async (original) => ({ ...await original<typeof import("./scheduleApi")>(), ...schedule }));
vi.mock("./api", () => api);
vi.mock("@/features/social/GuildEventPanels", () => ({ default: ({ guildId, selectedEventId, onAccessLost }: { guildId: number; selectedEventId: number; onAccessLost: () => void }) => <div>길드 원본 상세 #{guildId}/{selectedEventId}<button onClick={onAccessLost}>접근 상실</button></div> }));

const personal: ScheduleRow = { sourceType: "ROLE_EVENT", sourceId: 9, roleId: 1, guildId: null, guildName: null, title: "개인 점검", startsAt: "2026-10-10T00:00:00Z", endsAt: "2026-10-10T01:00:00Z", status: "PLANNED", myRsvp: null };
const guild: ScheduleRow = { sourceType: "GUILD_EVENT", sourceId: 9, roleId: null, guildId: 7, guildName: "비공개 길드", title: "길드 모임", startsAt: "2026-10-11T00:00:00Z", endsAt: "2026-10-11T01:00:00Z", status: "PLANNED", myRsvp: false };
const page = (contents: ScheduleRow[]) => ({ contents, page: 0, size: 20, totalElements: contents.length, totalPages: contents.length ? 1 : 0 });
const props = { roleId: 1, roleName: "내 역할", roleStatus: "ACTIVE", createRequest: 0, reentryRequest: 0, onBack: vi.fn() };

beforeEach(() => {
  vi.resetAllMocks();
  schedule.roleSchedule.mockResolvedValue(page([personal, guild]));
  api.listPersonsApi.mockResolvedValue([]);
  api.getRoleEventApi.mockResolvedValue({ id: 9, roleId: 1, title: "개인 점검", description: null, startsAt: personal.startsAt, endsAt: personal.endsAt, status: "PLANNED", participants: [], version: 0 });
});

it("keeps colliding source IDs distinct and opens each original detail", async () => {
  render(<RoleEventPanels {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: /길드 모임/ }));
  expect(screen.getByText("길드 원본 상세 #7/9")).toBeInTheDocument();
  expect(api.getRoleEventApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: /개인 점검/ }));
  await waitFor(() => expect(api.getRoleEventApi).toHaveBeenCalledWith(1, 9));
  expect(screen.queryByText("길드 원본 상세 #7/9")).not.toBeInTheDocument();
  expect(document.querySelectorAll('[data-event-key="ROLE_EVENT:9"]')).toHaveLength(1);
  expect(document.querySelectorAll('[data-event-key="GUILD_EVENT:9"]')).toHaveLength(1);
});

it("maps the participation and unscheduled controls to valid schedule reads", async () => {
  render(<RoleEventPanels {...props} />);
  await screen.findByRole("button", { name: /길드 모임/ });
  fireEvent.change(screen.getByRole("combobox", { name: "출처" }), { target: { value: "PARTICIPATING" } });
  await waitFor(() => expect(schedule.roleSchedule).toHaveBeenLastCalledWith(1, expect.objectContaining({ source: "PARTICIPATING", unscheduled: false, page: 0 })));
  fireEvent.click(screen.getByRole("button", { name: "시간 미정 보기" }));
  await waitFor(() => expect(schedule.roleSchedule).toHaveBeenLastCalledWith(1, expect.objectContaining({ source: "PERSONAL", unscheduled: true, page: 0 })));
  expect(api.createRoleEventApi).not.toHaveBeenCalled();
});

it("ignores an older period response and removes a private Guild row on access loss", async () => {
  let resolveOld!: (value: ReturnType<typeof page>) => void;
  schedule.roleSchedule.mockReturnValueOnce(new Promise((resolve) => { resolveOld = resolve; })).mockResolvedValueOnce(page([guild]));
  render(<RoleEventPanels {...props} />);
  fireEvent.change(screen.getByLabelText("기간"), { target: { value: "2026-11" } });
  fireEvent.click(await screen.findByRole("button", { name: /길드 모임/ }));
  await act(async () => resolveOld(page([{ ...personal, title: "늦은 개인 응답" }])));
  expect(screen.queryByRole("button", { name: /늦은 개인 응답/ })).not.toBeInTheDocument();
  schedule.roleSchedule.mockResolvedValueOnce(page([]));
  fireEvent.click(screen.getByRole("button", { name: "접근 상실" }));
  await waitFor(() => expect(screen.queryByRole("button", { name: /길드 모임/ })).not.toBeInTheDocument());
  expect(screen.queryByText("길드 원본 상세 #7/9")).not.toBeInTheDocument();
});
