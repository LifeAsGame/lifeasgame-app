import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { tokenStorage } from "@/shared/api/tokenStorage";
import type { TokenPair, UserInfo } from "@/shared/api/types";
import { AuthProvider, useAuth } from "./AuthContext";

const apiMocks = vi.hoisted(() => ({
  getMeApi: vi.fn(),
  loginApi: vi.fn(),
  registerApi: vi.fn(),
}));

vi.mock("./api", () => apiMocks);

const session: TokenPair = { accessToken: "access", refreshToken: "refresh", userId: 1, playerId: 6 };
const playerInfo: UserInfo = {
  user: { id: 1, email: "player@lag.io", nickname: "Kirito", status: "ACTIVE" },
  player: { exists: true, playerId: 6 },
  ui: { nextActions: [], badges: { notifications: 0, pendingRewards: 0 } },
};

function Probe() {
  const auth = useAuth();
  const [outcome, setOutcome] = useState("");
  return (
    <div>
      <span data-testid="state">{auth.isLoading ? "loading" : auth.currentUser?.email ?? "guest"}</span>
      <span data-testid="player">{String(auth.playerId)}</span>
      <span data-testid="outcome">{outcome}</span>
      <button onClick={() => void auth.login("player@lag.io", "password123").then(({ userInfo }) => setOutcome(userInfo.player.exists ? "player" : "missing"))}>login</button>
      <button onClick={auth.logout}>logout</button>
    </div>
  );
}

describe("인증 session을 관리할 때", () => {
  beforeEach(() => {
    window.localStorage.clear();
    apiMocks.getMeApi.mockReset();
    apiMocks.loginApi.mockReset();
    apiMocks.registerApi.mockReset();
  });

  describe("저장된 token으로 앱을 시작하면", () => {
    it("/users/me 결과로 current user와 player를 bootstrap한다", async () => {
      tokenStorage.write(session);
      apiMocks.getMeApi.mockResolvedValue(playerInfo);

      render(<AuthProvider><Probe /></AuthProvider>);

      await waitFor(() => expect(screen.getByTestId("state")).toHaveTextContent("player@lag.io"));
      expect(screen.getByTestId("player")).toHaveTextContent("6");
      expect(apiMocks.getMeApi).toHaveBeenCalledOnce();
    });
  });

  describe("로그인과 로그아웃을 수행하면", () => {
    it("login TokenPair를 저장하고 player 존재 상태를 반환한다", async () => {
      apiMocks.loginApi.mockResolvedValue(session);
      apiMocks.getMeApi.mockResolvedValue(playerInfo);
      render(<AuthProvider><Probe /></AuthProvider>);

      fireEvent.click(screen.getByRole("button", { name: "login" }));

      await waitFor(() => expect(screen.getByTestId("outcome")).toHaveTextContent("player"));
      expect(tokenStorage.read()).toEqual(session);
    });

    it("Character가 없으면 missing 상태로 구분한다", async () => {
      apiMocks.loginApi.mockResolvedValue({ ...session, playerId: null });
      apiMocks.getMeApi.mockResolvedValue({ ...playerInfo, player: { exists: false, playerId: null } });
      render(<AuthProvider><Probe /></AuthProvider>);

      fireEvent.click(screen.getByRole("button", { name: "login" }));

      await waitFor(() => expect(screen.getByTestId("outcome")).toHaveTextContent("missing"));
      expect(screen.getByTestId("player")).toHaveTextContent("null");
    });

    it("logout은 token과 사용자 상태를 함께 지운다", async () => {
      tokenStorage.write(session);
      apiMocks.getMeApi.mockResolvedValue(playerInfo);
      render(<AuthProvider><Probe /></AuthProvider>);
      await screen.findByText("player@lag.io");

      fireEvent.click(screen.getByRole("button", { name: "logout" }));

      expect(tokenStorage.read()).toBeNull();
      expect(screen.getByTestId("state")).toHaveTextContent("guest");
    });
  });
});
