import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import GuildMemberNote from "./GuildMemberNote";
const api = vi.hoisted(() => ({ getGuildNote: vi.fn(), getMemberPerson: vi.fn(), saveGuildNote: vi.fn(), deleteGuildNote: vi.fn() }));
vi.mock("./memberPersonApi", () => api);
const note = { id: 9, personId: 7, guildId: 22, targetMemberPlayerId: 103, text: "A 메모", version: 2, availability: "CURRENT", guildName: "길드A" };
const props = { context: { groupType: "GUILD" as const, groupId: 22, memberPlayerId: 103 }, personId: 7, editable: true, onDenied: vi.fn() };
beforeEach(() => { vi.resetAllMocks(); api.getGuildNote.mockResolvedValue(note); api.saveGuildNote.mockImplementation((_g, _p, body) => Promise.resolve({ ...note, ...body, version: 3 })); api.getMemberPerson.mockResolvedValue({ personId: 7 }); });
async function edit() { const row = await screen.findByRole("button", { name: /나만의 메모/ }); fireEvent.keyDown(row, { key: "F10", shiftKey: true }); fireEvent.click(screen.getByRole("button", { name: "수정" })); }
it("saves only the selected Guild note with its version and supports empty text", async () => {
  render(<GuildMemberNote {...props} />); await edit(); fireEvent.change(screen.getByLabelText("나만의 메모"), { target: { value: "   " } }); fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));
  await waitFor(() => expect(api.saveGuildNote).toHaveBeenCalledWith(22, 103, { personId: 7, text: "", version: 2 })); expect(api.deleteGuildNote).not.toHaveBeenCalled();
});
it("retains a conflicting draft and requires an explicit version refresh before retry", async () => {
  api.saveGuildNote.mockRejectedValueOnce(new ApiError(409, "CONFLICT", "충돌")); render(<GuildMemberNote {...props} />); await edit();
  fireEvent.change(screen.getByLabelText("나만의 메모"), { target: { value: "내 초안" } }); fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));
  await screen.findByRole("button", { name: "최신 상태 확인" }); expect(screen.getByLabelText("나만의 메모")).toHaveValue("내 초안"); expect(screen.getByRole("button", { name: "메모 저장" })).toBeDisabled();
  api.getGuildNote.mockResolvedValue({ ...note, version: 3, text: "다른 창의 수정" }); fireEvent.click(screen.getByRole("button", { name: "최신 상태 확인" })); await waitFor(() => expect(screen.getByRole("button", { name: "메모 저장" })).toBeEnabled());
  expect(screen.getByLabelText("나만의 메모")).toHaveValue("내 초안"); fireEvent.click(screen.getByRole("button", { name: "메모 저장" })); await waitFor(() => expect(api.saveGuildNote).toHaveBeenLastCalledWith(22, 103, { personId: 7, text: "내 초안", version: 3 }));
});
it("treats 404 as an empty note only after live membership revalidation", async () => {
  api.getGuildNote.mockRejectedValue(new ApiError(404, "NOT_FOUND", "없음")); api.getMemberPerson.mockRejectedValue(new ApiError(404, "GROUP_NOT_FOUND", "접근 불가"));
  render(<GuildMemberNote {...props} />); await waitFor(() => expect(props.onDenied).toHaveBeenCalled()); expect(screen.queryByRole("button", { name: "나만의 메모 쓰기" })).not.toBeInTheDocument();
});
it("keeps note input on membership loss and disables writing", async () => {
  api.saveGuildNote.mockRejectedValue(new ApiError(404, "GROUP_NOT_FOUND", "접근 불가")); render(<GuildMemberNote {...props} />); await edit(); fireEvent.change(screen.getByLabelText("나만의 메모"), { target: { value: "떠나기 전 초안" } }); fireEvent.click(screen.getByRole("button", { name: "메모 저장" }));
  await waitFor(() => expect(props.onDenied).toHaveBeenCalled()); expect(screen.getByLabelText("나만의 메모")).toHaveValue("떠나기 전 초안"); expect(screen.getByRole("button", { name: "메모 저장" })).toBeDisabled();
});
