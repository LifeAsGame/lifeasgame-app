import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useState } from "react";
import { RoleContextPanel } from "@/widgets/left-context/ui/RoleContextPanel";
import RoleShell from "./RoleShell";
const api = vi.hoisted(() => ({ createRoleApi: vi.fn(), updateRoleApi: vi.fn(), archiveRoleApi: vi.fn(), listPersonsApi: vi.fn() }));
vi.mock("./api", () => api);
it("역할 생성은 목록 자리의 패널이며 실패 초안과 취소 후 목록을 보존한다", async () => {
  api.createRoleApi.mockRejectedValueOnce(new Error("등록 실패")).mockResolvedValueOnce({ id: 1 });
  const refresh = vi.fn().mockResolvedValue(undefined);
  function Harness() {
    const [request, setRequest] = useState(0);
    return <><RoleContextPanel workspace="roles" onWorkspaceChange={(_, create) => { if (create) setRequest((value) => value + 1); }} />
      <RoleShell roles={[]} selectedRoleId={null} roleCreateRequest={request} onSelectRole={() => {}} onRefresh={refresh} /></>;
  }
  render(<Harness />);
  expect(screen.queryByRole("link", { name: /Create Role/ })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: "역할" }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByLabelText("역할 유형"), { target: { value: "FAMILY" } });
  fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "가족" } });
  fireEvent.change(screen.getByLabelText("역할 설명"), { target: { value: "함께 생활" } });
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("등록 실패"); expect(screen.getByLabelText("역할 이름")).toHaveValue("가족");
  fireEvent.keyDown(screen.getByLabelText("역할 이름"), { key: "Escape" });
  expect(screen.getByText("등록된 역할이 없습니다.")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: "역할" }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByLabelText("역할 유형"), { target: { value: "FAMILY" } });
  fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "가족" } });
  fireEvent.change(screen.getByLabelText("역할 설명"), { target: { value: "함께 생활" } });
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(api.createRoleApi).toHaveBeenLastCalledWith({ roleType: "FAMILY", name: "가족", description: "함께 생활" });
  expect(screen.getByRole("button", { name: "역할" })).toBeInTheDocument();
});
