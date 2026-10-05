import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import GroupActivityPanels from "./GroupActivityPanels";

const api = vi.hoisted(() => ({ activities: vi.fn(), activity: vi.fn(), updateActivity: vi.fn(), createActivity: vi.fn(), finishActivity: vi.fn(), activityRsvp: vi.fn(), cancelActivityRsvp: vi.fn(), activityParticipants: vi.fn(), activityEditors: vi.fn(), grantActivityEditor: vi.fn(), revokeActivityEditor: vi.fn() }));
const groups = vi.hoisted(() => ({ groupMembers: vi.fn() }));
vi.mock("./groupActivitiesApi", () => api);
vi.mock("./groups", () => groups);
const record = { id: 11, groupType: "PARTY", groupId: 7, title: "산책", sharedDescription: "모임 설명과 별개", location: "공원", startsAt: "2026-10-10T00:00:00Z", endsAt: "2026-10-10T01:00:00Z", status: "PLANNED", createdByPlayerId: 4, createdAt: "2026-10-06T00:00:00Z", updatedAt: "2026-10-06T00:00:00Z", version: 0, participantCount: 0, myRsvp: false, capabilities: { canEdit: true, canManageEditors: true, canRsvp: true } };
const page = { contents: [record], page: 0, size: 20, totalElements: 1, totalPages: 1 };

beforeEach(() => { vi.resetAllMocks(); api.activities.mockResolvedValue(page); api.activity.mockResolvedValue(record); });

it("keeps an edited draft after a 409 while refreshing its version", async () => {
  api.updateActivity.mockRejectedValueOnce(new ApiError(409, "CONFLICT", "stale"));
  api.activity.mockResolvedValueOnce(record).mockResolvedValueOnce({ ...record, title: "다른 사람의 수정", version: 1 });
  render(<GroupActivityPanels groupType="PARTY" groupId={7} leader parentStageKey="social-detail" onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: /산책/ }));
  fireEvent.click(await screen.findByRole("button", { name: "활동 수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "활동 제목" }), { target: { value: "내 초안" } });
  fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("초안은 유지했습니다"));
  expect(screen.getByRole("textbox", { name: "활동 제목" })).toHaveValue("내 초안");
  api.updateActivity.mockResolvedValueOnce({ ...record, title: "내 초안", version: 2 });
  fireEvent.click(screen.getByRole("button", { name: "변경 저장" }));
  await waitFor(() => expect(api.updateActivity).toHaveBeenLastCalledWith("PARTY", 7, 11, expect.objectContaining({ title: "내 초안" }), 1));
});

it("reuses one create key when a network retry follows an uncertain result", async () => {
  api.activities.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.createActivity.mockRejectedValueOnce(new Error("network down")).mockResolvedValueOnce(record);
  render(<GroupActivityPanels groupType="PARTY" groupId={7} leader creating parentStageKey="social-detail" onBack={() => {}} />);
  fireEvent.change(screen.getByRole("textbox", { name: "활동 제목" }), { target: { value: "산책" } });
  fireEvent.change(screen.getByLabelText("시작"), { target: { value: "2026-10-10T09:00" } });
  fireEvent.change(screen.getByLabelText("종료"), { target: { value: "2026-10-10T10:00" } });
  fireEvent.click(screen.getByRole("button", { name: "활동 저장" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("network down"));
  fireEvent.click(screen.getByRole("button", { name: "활동 저장" }));
  await waitFor(() => expect(api.createActivity).toHaveBeenCalledTimes(2));
  expect(api.createActivity.mock.calls[0][3]).toBe(api.createActivity.mock.calls[1][3]);
});

it("lets a leader grant an editor before the first activity exists", async () => {
  api.activities.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  api.activityEditors.mockResolvedValue({ contents: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  groups.groupMembers.mockResolvedValue({ contents: [{ playerId: 4, role: "LEADER" }, { playerId: 5, role: "MEMBER" }], page: 0, size: 20, totalElements: 2, totalPages: 1 });
  api.grantActivityEditor.mockResolvedValue(undefined);
  render(<GroupActivityPanels groupType="PARTY" groupId={7} leader parentStageKey="social-detail" onBack={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "편집자" }));
  fireEvent.click(await screen.findByRole("button", { name: "편집자로 지정" }));
  await waitFor(() => expect(api.grantActivityEditor).toHaveBeenCalledWith("PARTY", 7, 5));
});
