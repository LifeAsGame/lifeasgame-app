import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import CreateRolePage from "./page";

const mocks = vi.hoisted(() => ({ createRoleApi: vi.fn(), replace: vi.fn(), useAuth: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/features/role/api", () => ({ createRoleApi: mocks.createRoleApi }));

function fillRoleForm() {
  fireEvent.change(screen.getByLabelText("Role Type"), { target: { value: "PROFESSIONAL" } });
  fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Engineer" } });
  fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Build useful things" } });
}

describe("첫 Role을 만들 때", () => {
  beforeEach(() => {
    mocks.createRoleApi.mockReset();
    mocks.replace.mockReset();
    mocks.useAuth.mockReturnValue({
      currentUser: { id: 1, email: "new@lag.io", nickname: "Newbie", status: "ACTIVE" },
      playerId: 77,
      isAuthenticated: true,
      isLoading: false,
    });
  });

  describe("유효한 form을 제출하면", () => {
    it("정확한 payload를 보내고 성공 후 홈으로 이동한다", async () => {
      mocks.createRoleApi.mockResolvedValue({ id: 3 });
      render(<CreateRolePage />);
      fillRoleForm();

      fireEvent.click(screen.getByRole("button", { name: "CREATE ROLE" }));

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
      expect(mocks.createRoleApi).toHaveBeenCalledWith({
        roleType: "PROFESSIONAL",
        name: "Engineer",
        description: "Build useful things",
      });
    });

    it("요청이 pending인 동안 중복 submit을 무시한다", async () => {
      let finish!: () => void;
      mocks.createRoleApi.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
      render(<CreateRolePage />);
      fillRoleForm();
      const form = screen.getByRole("button", { name: "CREATE ROLE" }).closest("form");

      fireEvent.submit(form!);
      fireEvent.submit(form!);

      expect(mocks.createRoleApi).toHaveBeenCalledOnce();
      finish();
      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    });
  });
});
