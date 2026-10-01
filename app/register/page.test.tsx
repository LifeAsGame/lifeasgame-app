import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import RegisterPage from "./page";

const mocks = vi.hoisted(() => ({ register: vi.fn(), replace: vi.fn(), useAuth: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: mocks.useAuth }));

function submitRegistration() {
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "new@lag.io" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
  fireEvent.change(screen.getByLabelText("닉네임"), { target: { value: "Newbie" } });
  fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
}

describe("회원가입을 제출할 때", () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.replace.mockReset();
    mocks.useAuth.mockReturnValue({ register: mocks.register, currentUser: null, playerId: null, isLoading: false });
  });

  describe("backend가 가입 결과를 반환하면", () => {
    it("즉시 인증된 계정은 Link Start로 이동한다", async () => {
      mocks.register.mockResolvedValue({
        requiresVerification: false,
        tokenPair: { accessToken: "a", refreshToken: "r", userId: 2, playerId: null },
      });
      render(<RegisterPage />);

      submitRegistration();

      await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/linkstart"));
      expect(mocks.register).toHaveBeenCalledWith("new@lag.io", "password123", "Newbie");
    });

    it("verification required이면 pending 안내를 표시한다", async () => {
      mocks.register.mockResolvedValue({ requiresVerification: true, tokenPair: null });
      render(<RegisterPage />);

      submitRegistration();

      expect(await screen.findByText("이메일 인증을 완료한 뒤 로그인해 주세요.")).toBeInTheDocument();
      expect(mocks.replace).not.toHaveBeenCalled();
    });
  });
});
