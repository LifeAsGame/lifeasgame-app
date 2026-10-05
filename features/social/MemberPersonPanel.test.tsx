import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import { tokenStorage } from "@/shared/api/tokenStorage";
import MemberPersonPanel from "./MemberPersonPanel";
const api = vi.hoisted(() => ({ getMemberPerson: vi.fn(), selectMemberPerson: vi.fn(), createMemberPerson: vi.fn(), getGuildNote: vi.fn(), saveGuildNote: vi.fn(), deleteGuildNote: vi.fn(), getPersonApi: vi.fn(), listPersonsApi: vi.fn(), listRolesApi: vi.fn(), createRoleRelationApi: vi.fn(), updateRoleRelationApi: vi.fn(), personRoleContexts: vi.fn() }));
vi.mock("./memberPersonApi", () => api);
vi.mock("@/features/role/api", () => api);
vi.mock("@/features/role/contextApi", () => api);
const context = { groupType: "GUILD" as const, groupId: 22, memberPlayerId: 103 };
const person = { id: 7, displayName: "내 별칭", status: "ACTIVE", linkedUserId: 901, notes: "공통 메모", profile: null };
const role = { id: 31, name: "학습", status: "ACTIVE" };
const page = (contents: object[] = []) => ({ contents, page: 0, size: 20, totalElements: contents.length, totalPages: 1 });
const props = { context, member: { role: "MEMBER", joinedAt: "2026-10-05T00:00:00Z" }, parentStageKey: "social-sub", registration: true, originRole: role, onBack: vi.fn(), onPrivacyLost: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  api.getMemberPerson.mockResolvedValue({ ...context, personId: null, personStatus: null });
  api.getPersonApi.mockResolvedValue(person); api.listPersonsApi.mockResolvedValue([person]); api.listRolesApi.mockResolvedValue([role]); api.personRoleContexts.mockResolvedValue(page());
  api.createMemberPerson.mockResolvedValue({ ...context, personId: 7, personStatus: "ACTIVE" }); api.selectMemberPerson.mockResolvedValue({ ...context, personId: 7, personStatus: "ACTIVE" });
  api.createRoleRelationApi.mockResolvedValue({ id: 11, status: "ACTIVE", relationType: "MENTOR", roleNotes: "역할 메모", version: 0 });
  api.getGuildNote.mockRejectedValue(new ApiError(404, "NOTE_NOT_FOUND", "없음"));
});
async function create() {
  fireEvent.click(await screen.findByRole("button", { name: "새 인물 등록" }));
  expect(screen.getByLabelText("인물 이름")).toHaveValue("");
  fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "사용자가 정한 이름" } });
  fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  await screen.findByLabelText("관계 유형");
}
it("requires explicit identity choice and retains successful Person through relation-only retry", async () => {
  api.createRoleRelationApi.mockRejectedValueOnce(new Error("관계 저장 실패"));
  render(<MemberPersonPanel {...props} />);
  await screen.findByRole("button", { name: "새 인물 등록" }); expect(api.createMemberPerson).not.toHaveBeenCalled();
  await create();
  fireEvent.change(screen.getByLabelText("관계 유형"), { target: { value: "MENTOR" } }); fireEvent.change(screen.getByLabelText("역할 메모"), { target: { value: "관계만 재시도" } });
  fireEvent.click(screen.getByRole("button", { name: "관계 저장" })); await screen.findByText("관계 저장 실패");
  expect(screen.getByLabelText("역할 메모")).toHaveValue("관계만 재시도");
  fireEvent.click(screen.getByRole("button", { name: "관계 저장" }));
  await waitFor(() => expect(api.createRoleRelationApi).toHaveBeenCalledTimes(2)); expect(api.createMemberPerson).toHaveBeenCalledTimes(1);
  expect(api.createRoleRelationApi).toHaveBeenLastCalledWith(31, { personId: 7, relationType: "MENTOR", roleNotes: "관계만 재시도" });
  expect(api.createMemberPerson).toHaveBeenCalledWith(context, expect.objectContaining({ displayName: "사용자가 정한 이름", notes: null, contact: null, birthday: null }));
});
it("retries only reads after successful identity creation followed by a failed Person read", async () => {
  api.getPersonApi.mockRejectedValueOnce(new Error("인물 조회 실패")); render(<MemberPersonPanel {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "새 인물 등록" })); fireEvent.change(screen.getByLabelText("인물 이름"), { target: { value: "내 인물" } }); fireEvent.click(screen.getByRole("button", { name: "인물 저장" }));
  await screen.findByText("인물 조회 실패"); fireEvent.click(screen.getByRole("button", { name: "다시 조회" })); await screen.findByLabelText("관계 유형");
  expect(api.createMemberPerson).toHaveBeenCalledTimes(1); expect(api.getPersonApi).toHaveBeenCalledTimes(2);
});
it("links an explicitly selected existing Person and returns conflicts to the choice step", async () => {
  api.selectMemberPerson.mockRejectedValueOnce(new ApiError(409, "PER-CONFLICT", "이미 연결됨")); render(<MemberPersonPanel {...props} />);
  fireEvent.click(await screen.findByRole("button", { name: "기존 인물 선택" })); await screen.findByRole("option", { name: "내 별칭" });
  fireEvent.change(screen.getByLabelText("내 기존 인물"), { target: { value: "7" } }); fireEvent.click(screen.getByRole("button", { name: "이 인물 연결" }));
  await screen.findByRole("button", { name: "기존 인물 선택" }); expect(api.selectMemberPerson).toHaveBeenCalledWith(context, 7); expect(api.createMemberPerson).not.toHaveBeenCalled();
});
it("reads existing archived relationships without duplicate creation or automatic restoration", async () => {
  api.getMemberPerson.mockResolvedValue({ ...context, personId: 7, personStatus: "ACTIVE" });
  api.personRoleContexts.mockResolvedValue(page([{ relationId: 11, roleId: 31, personId: 7, roleName: "학습", roleStatus: "ACTIVE", relationStatus: "ARCHIVED", relationType: "MENTOR", roleNotes: "보관 메모" }]));
  render(<MemberPersonPanel {...props} />); await screen.findByText("보관 메모"); expect(screen.queryByRole("button", { name: "관계 저장" })).not.toBeInTheDocument(); expect(api.createRoleRelationApi).not.toHaveBeenCalled();
});
it("requires active Role selection when entered from a general group", async () => {
  api.getMemberPerson.mockResolvedValue({ ...context, personId: 7, personStatus: "ACTIVE" });
  render(<MemberPersonPanel {...props} originRole={undefined} />); await screen.findByLabelText("내 활성 역할"); expect(screen.queryByRole("button", { name: "관계 저장" })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("내 활성 역할"), { target: { value: "31" } }); expect(screen.getByRole("button", { name: "관계 저장" })).toBeEnabled();
});
it("preserves relation input and successful identity while evicting private group context on real denial", async () => {
  api.getMemberPerson.mockResolvedValue({ ...context, personId: 7, personStatus: "ACTIVE" }); api.createRoleRelationApi.mockRejectedValue(new ApiError(404, "SOC-404", "접근 불가"));
  render(<MemberPersonPanel {...props} />); fireEvent.change(await screen.findByLabelText("관계 유형"), { target: { value: "FRIEND" } }); fireEvent.change(screen.getByLabelText("역할 메모"), { target: { value: "보존할 초안" } }); fireEvent.click(screen.getByRole("button", { name: "관계 저장" }));
  await waitFor(() => expect(props.onPrivacyLost).toHaveBeenCalled()); expect(screen.getByLabelText("역할 메모")).toHaveValue("보존할 초안"); expect(screen.getByRole("button", { name: "관계 저장" })).toBeDisabled();
});
it("evicts all private Person and note state when the account changes", async () => {
  tokenStorage.write({ accessToken: "a", refreshToken: "r", userId: 1, playerId: 2 }); api.getMemberPerson.mockResolvedValue({ ...context, personId: 7, personStatus: "ACTIVE" });
  render(<MemberPersonPanel {...props} />); await screen.findByText("공통 메모");
  act(() => tokenStorage.write({ accessToken: "b", refreshToken: "s", userId: 3, playerId: 4 })); expect(screen.queryByText("공통 메모")).not.toBeInTheDocument();
});
