import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import GroupShell from "./GroupShell";

const api = vi.hoisted(() => ({ groupSearch: vi.fn(), groupMine: vi.fn(), groupPending: vi.fn(), groupInfo: vi.fn(), groupPreview: vi.fn(), groupMe: vi.fn(), groupMembers: vi.fn(), groupWaiters: vi.fn(), groupCreate: vi.fn(), groupCommand: vi.fn() }));
vi.mock("./groups", () => api);
const page = (contents: unknown[]) => ({ contents, page: 0, size: 20, totalElements: contents.length, totalPages: 1 });
const group = { id: 3, name: "산책 모임", code: "WALK", visibility: "PUBLIC", joinPolicy: "APPROVAL", status: "ACTIVE", maxMembers: 35, descriptionMd: "주말 산책", tags: [], leaderPlayerId: 6 };

beforeEach(() => {
  vi.resetAllMocks();
  api.groupMine.mockResolvedValue(page([{ id: 3, name: "산책 모임", code: "WALK", status: "ACTIVE", maxMembers: 35, memberCount: 2, myRole: "LEADER" }]));
  api.groupSearch.mockResolvedValue(page([group]));
  api.groupPending.mockResolvedValue(page([]));
  api.groupMe.mockResolvedValue({ myRole: "LEADER", pendingJoin: false, pendingInvitation: false, actions: ["rename", "policy", "description", "approve", "reject", "invite", "disband"] });
  api.groupInfo.mockResolvedValue(group);
  api.groupPreview.mockResolvedValue(group);
  api.groupMembers.mockResolvedValue(page([{ playerId: 6, role: "LEADER", joinedAt: "2026-10-01T00:00:00Z" }]));
  api.groupWaiters.mockResolvedValue(page([]));
  api.groupCreate.mockResolvedValue(group);
  api.groupCommand.mockResolvedValue(undefined);
});

it("내 모임에서 멤버와 허용된 관리 화면을 연결한다", async () => {
  render(<GroupShell kind="guilds" playerId={6} onBack={vi.fn()} />);
  fireEvent.click(await screen.findByRole("button", { name: /산책 모임.*리더/ }));
  expect(await screen.findByText("주말 산책")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "멤버" }));
  expect(await screen.findByText("플레이어 #6")).toBeInTheDocument();
  expect(api.groupMembers).toHaveBeenCalledWith("guilds", 3, 0);
  fireEvent.click(screen.getByRole("button", { name: "모임 상세로" }));
  fireEvent.click(screen.getByRole("button", { name: "정책 수정" }));
  expect(screen.getByRole("combobox", { name: "가입 방식" })).toHaveValue("APPROVAL");
});

it("생성 폼은 서버 계약의 공개 범위·가입 방식·정원을 전송한다", async () => {
  const view = render(<GroupShell kind="parties" playerId={6} onBack={vi.fn()} />);
  view.rerender(<GroupShell kind="parties" playerId={6} createRequest={1} onBack={vi.fn()} />);
  fireEvent.change(screen.getByRole("textbox", { name: "이름" }), { target: { value: "새 파티" } });
  fireEvent.change(screen.getByRole("textbox", { name: "코드 (직접 입력)" }), { target: { value: "NEW" } });
  fireEvent.change(screen.getByRole("combobox", { name: "공개 범위" }), { target: { value: "PRIVATE" } });
  fireEvent.change(screen.getByRole("combobox", { name: "가입 방식" }), { target: { value: "INVITE_ONLY" } });
  fireEvent.change(screen.getByRole("spinbutton", { name: "정원" }), { target: { value: "8" } });
  fireEvent.click(screen.getByRole("button", { name: "파티 생성" }));
  await waitFor(() => expect(api.groupCreate).toHaveBeenCalledWith("parties", { name: "새 파티", code: "NEW", descriptionMd: null, visibility: "PRIVATE", joinPolicy: "INVITE_ONLY", maxMembers: 8 }));
});

it("비공개 초대는 최소 정보와 수락 작업만 표시하고 멤버 상세를 요청하지 않는다", async () => {
  api.groupPending.mockResolvedValue(page([{ id: 9, guildId: 5, playerId: 6, name: "비공개 길드", code: "SECRET", type: "INVITATION", status: "PENDING", message: null, requestedAt: "2026-10-01T00:00:00Z", expiresAt: null }]));
  api.groupMe.mockResolvedValue({ myRole: null, pendingJoin: false, pendingInvitation: true, actions: ["accept-invitation", "decline-invitation"] });
  render(<GroupShell kind="guilds" playerId={6} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "받은 초대" }));
  fireEvent.click(await screen.findByRole("button", { name: /비공개 길드/ }));
  expect(await screen.findByRole("button", { name: "초대 수락" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "비공개 길드" })).toBeInTheDocument();
  expect(api.groupInfo).not.toHaveBeenCalled();
  expect(api.groupPreview).not.toHaveBeenCalled();
});

it("비공개 모임의 본인 가입 신청은 상세 조회 없이 취소할 수 있다", async () => {
  api.groupPending.mockResolvedValue(page([{ id: 12, guildId: 8, playerId: 6, name: "비공개 신청", code: "HIDDEN", type: "JOIN_REQUEST", status: "PENDING", message: null, requestedAt: "2026-10-01T00:00:00Z", expiresAt: null }]));
  api.groupMe.mockRejectedValue(new ApiError(404, "SOC-404-GUILD-NOT-FOUND", "찾을 수 없습니다."));
  render(<GroupShell kind="guilds" playerId={6} onBack={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "내 신청" }));
  fireEvent.click(await screen.findByRole("button", { name: /비공개 신청/ }));
  fireEvent.click(await screen.findByRole("button", { name: "신청 취소" }));
  await waitFor(() => expect(api.groupCommand).toHaveBeenCalledWith("guilds", 8, "cancel-join", {}));
  expect(api.groupInfo).not.toHaveBeenCalled();
  expect(api.groupPreview).not.toHaveBeenCalled();
});
