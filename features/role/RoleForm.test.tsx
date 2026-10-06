import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useState } from "react";
import { RoleContextPanel } from "@/widgets/left-context/ui/RoleContextPanel";
import RoleShell from "./RoleShell";
import { RoleForm } from "./RoleForm";
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
  fireEvent.change(screen.getByLabelText("직접 입력할 유형"), { target: { value: "FAMILY" } });
  fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "가족" } });
  fireEvent.change(screen.getByLabelText("역할 설명"), { target: { value: "함께 생활" } });
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("등록 실패"); expect(screen.getByLabelText("역할 이름")).toHaveValue("가족");
  fireEvent.keyDown(screen.getByLabelText("역할 이름"), { key: "Escape" });
  expect(screen.getByText("등록된 역할이 없습니다.")).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: "역할" }), { key: "Enter", altKey: true });
  fireEvent.change(screen.getByLabelText("직접 입력할 유형"), { target: { value: "FAMILY" } });
  fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "가족" } });
  fireEvent.change(screen.getByLabelText("역할 설명"), { target: { value: "함께 생활" } });
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  expect(api.createRoleApi).toHaveBeenLastCalledWith({ roleType: "FAMILY", name: "가족", description: "함께 생활" });
  expect(screen.getByRole("button", { name: "역할" })).toBeInTheDocument();
});

it("역할 목록 재진입은 생성 폼을 닫고 새 생성은 다시 연다", () => {
  function Harness() {
    const [request, setRequest] = useState(0);
    return <><RoleContextPanel workspace="roles" onWorkspaceChange={(_, create) => setRequest((value) => create ? value + 1 : 0)} />
      <RoleShell roles={[]} selectedRoleId={null} roleCreateRequest={request} onSelectRole={() => {}} onRefresh={async () => {}} /></>;
  }
  render(<Harness />);
  const menu = screen.getByRole("button", { name: "역할" });
  fireEvent.keyDown(menu, { key: "Enter", altKey: true });
  fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "작성 중" } });
  fireEvent.click(menu);
  expect(screen.queryByLabelText("역할 이름")).not.toBeInTheDocument();
  expect(screen.getByText("등록된 역할이 없습니다.")).toBeInTheDocument();
  fireEvent.keyDown(menu, { key: "Enter", altKey: true });
  expect(screen.getByLabelText("역할 이름")).toHaveValue("");
});

it("내 활성 유형만 제안하고 여정 템플릿과 원시 입력은 보존한다", async () => {
  api.createRoleApi.mockResolvedValue({ id: 3 });
  api.updateRoleApi.mockResolvedValue({ id: 4 });
  const onSaved = vi.fn().mockResolvedValue(undefined);
  const view = render(<RoleForm templateType="ROLE_BACKEND_DEVELOPER" onSaved={onSaved} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText("역할 유형"), { target: { value: "ROLE_BACKEND_DEVELOPER" } });
  fireEvent.change(screen.getByLabelText("역할 이름"), { target: { value: "내 개발 역할" } });
  fireEvent.change(screen.getByLabelText("역할 설명"), { target: { value: "서비스 개발" } });
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  await waitFor(() => expect(api.createRoleApi).toHaveBeenCalledWith({ roleType: "ROLE_BACKEND_DEVELOPER", name: "내 개발 역할", description: "서비스 개발" }));
  view.unmount();
  const activeRole = { id: 2, roleType: "FAMILY", name: "가족", description: "함께", status: "ACTIVE" as const, createdAt: "", updatedAt: "", version: 0 };
  const ordinary = render(<RoleForm roles={[activeRole, { ...activeRole, id: 3, roleType: "ROLE_JOB_SEEKER", status: "ARCHIVED" }]} onSaved={onSaved} onCancel={vi.fn()} />);
  expect(screen.getByRole("option", { name: "FAMILY" })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "ROLE_JOB_SEEKER" })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: "ROLE_BACKEND_DEVELOPER" })).not.toBeInTheDocument();
  ordinary.unmount();
  render(<RoleForm role={{ id: 4, roleType: "MY_CUSTOM_TYPE", name: "내 역할", description: "기존 설명", status: "ACTIVE", createdAt: "", updatedAt: "", version: 0 }} onSaved={onSaved} onCancel={vi.fn()} />);
  expect(screen.getByLabelText("역할 유형")).toHaveValue("custom");
  expect(screen.getByLabelText("직접 입력할 유형")).toHaveValue("MY_CUSTOM_TYPE");
  fireEvent.click(screen.getByRole("button", { name: "역할 저장" }));
  await waitFor(() => expect(api.updateRoleApi).toHaveBeenCalledWith(4, { roleType: "MY_CUSTOM_TYPE", name: "내 역할", description: "기존 설명" }));
});
