import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStorage } from "@/shared/api/tokenStorage";
import LinkStartPage from "./page";

const mocks = vi.hoisted(() => ({
  refreshApi: vi.fn(),
  registerPlayerApi: vi.fn(),
  reloadMe: vi.fn(),
  replace: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/features/auth/api", () => ({ refreshApi: mocks.refreshApi }));
vi.mock("@/features/player/api", () => ({ registerPlayerApi: mocks.registerPlayerApi }));

describe("Link Start를 완료할 때", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.refreshApi.mockReset();
    mocks.registerPlayerApi.mockReset();
    mocks.reloadMe.mockReset();
    mocks.replace.mockReset();
    mocks.useAuth.mockReturnValue({
      currentUser: { id: 1, email: "new@lag.io", nickname: "Newbie", status: "ACTIVE" },
      playerId: null,
      isAuthenticated: true,
      isLoading: false,
      reloadMe: mocks.reloadMe,
    });
  });

  describe("Character API가 새 token을 반환하면", () => {
    it("기존 userId를 보존해 token/playerId를 직접 저장하고 Role 생성으로 이동한다", async () => {
      tokenStorage.write({ accessToken: "old-a", refreshToken: "old-r", userId: 1, playerId: null });
      mocks.registerPlayerApi.mockResolvedValue({ id: 77, accessToken: "new-a", refreshToken: "new-r" });
      mocks.reloadMe.mockResolvedValue({});
      render(<LinkStartPage />);

      fireEvent.change(screen.getByLabelText("Character Name"), { target: { value: "Kirito" } });
      fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "FEMALE" } });
      fireEvent.click(screen.getByRole("button", { name: "LINK START" }));

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/roles/create"));
      expect(tokenStorage.read()).toEqual({ accessToken: "new-a", refreshToken: "new-r", userId: 1, playerId: 77 });
      expect(mocks.reloadMe).toHaveBeenCalledOnce();
      expect(mocks.refreshApi).not.toHaveBeenCalled();
    });
  });
});
