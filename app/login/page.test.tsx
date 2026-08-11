import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import LoginPage from "./page";

const mocks = vi.hoisted(() => ({ login: vi.fn(), replace: vi.fn(), useAuth: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: mocks.useAuth }));

const session = { accessToken: "a", refreshToken: "r", userId: 1, playerId: 6 };
const user = { id: 1, email: "player@lag.io", nickname: "Kirito", status: "ACTIVE" };

describe("로그인 form을 제출할 때", () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.replace.mockReset();
    mocks.useAuth.mockReturnValue({ login: mocks.login, currentUser: null, playerId: null, isLoading: false });
  });

  describe("current user를 bootstrap하면", () => {
    it("Character가 있으면 홈으로 이동한다", async () => {
      mocks.login.mockResolvedValue({
        session,
        userInfo: { user, player: { exists: true, playerId: 6 }, ui: { nextActions: [], badges: { notifications: 0, pendingRewards: 0 } } },
      });
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "player@lag.io" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "player123" } });
      fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/"));
    });

    it("Character가 없으면 Link Start로 이동한다", async () => {
      mocks.login.mockResolvedValue({
        session: { ...session, playerId: null },
        userInfo: { user, player: { exists: false, playerId: null }, ui: { nextActions: ["LINK_START"], badges: { notifications: 0, pendingRewards: 0 } } },
      });
      render(<LoginPage />);

      fireEvent.change(screen.getByLabelText("Email"), { target: { value: "new@lag.io" } });
      fireEvent.change(screen.getByLabelText("Password"), { target: { value: "password123" } });
      fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/linkstart"));
    });
  });
});
