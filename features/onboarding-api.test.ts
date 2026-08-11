import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerApi } from "@/features/auth/api";
import { registerPlayerApi } from "@/features/player/api";
import { createRoleApi } from "@/features/role/api";

const clientMocks = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...clientMocks }));

describe("real onboarding API를 호출할 때", () => {
  beforeEach(() => clientMocks.apiPost.mockReset());

  describe("각 entry step을 제출하면", () => {
    it("account payload를 unauthenticated register endpoint로 보낸다", async () => {
      clientMocks.apiPost.mockResolvedValue({ requiresVerification: true, tokenPair: null });

      await registerApi("new@lag.io", "password123", "Newbie");

      expect(clientMocks.apiPost).toHaveBeenCalledWith(
        "/api/v1/auth/register",
        { email: "new@lag.io", password: "password123", nickname: "Newbie" },
        { auth: false },
      );
    });

    it("Character payload를 정확한 /players/register endpoint로 보낸다", async () => {
      clientMocks.apiPost.mockResolvedValue({ id: 8, accessToken: "a", refreshToken: "r" });

      await registerPlayerApi({ name: "Kirito", gender: "MALE" });

      expect(clientMocks.apiPost).toHaveBeenCalledWith("/api/v1/players/register", { name: "Kirito", gender: "MALE" });
    });

    it("first Role payload를 /roles endpoint로 보낸다", async () => {
      const payload = { roleType: "PROFESSIONAL", name: "Engineer", description: "Build useful things" };
      clientMocks.apiPost.mockResolvedValue({ id: 3, status: "ACTIVE", ...payload });

      await createRoleApi(payload);

      expect(clientMocks.apiPost).toHaveBeenCalledWith("/api/v1/roles", payload);
    });
  });
});
