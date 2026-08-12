import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, apiDelete, apiGet, apiGetRaw, apiPost } from "./client";
import { tokenStorage } from "./tokenStorage";
import type { ApiEnvelope, TokenPair } from "./types";

const oldSession: TokenPair = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  userId: 1,
  playerId: 10,
};
const newSession: TokenPair = {
  accessToken: "new-access",
  refreshToken: "new-refresh",
  userId: 1,
  playerId: 10,
};

function response<T>(result: T, status = 200, overrides: Partial<ApiEnvelope<T>> = {}) {
  return new Response(JSON.stringify({ isSuccess: status < 400, code: "COMMON200", message: "OK", result, ...overrides }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("backend API에 요청할 때", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    window.localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  describe("응답 envelope을 해석하면", () => {
    it("성공 응답의 result만 반환한다", async () => {
      fetchMock.mockResolvedValueOnce(response({ id: 7 }));

      await expect(apiGet<{ id: number }>("/resource", { auth: false })).resolves.toEqual({ id: 7 });
    });

    it("실패 응답의 backend code와 message를 보존한다", async () => {
      fetchMock.mockResolvedValueOnce(response(null, 400, { isSuccess: false, code: "AUTH4001", message: "Bad credentials" }));

      const error = await apiPost("/login", {}, { auth: false }).catch((caught) => caught);
      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 400, code: "AUTH4001", message: "Bad credentials" });
    });

    it("raw 응답 endpoint는 result를 가정하지 않고 실제 body를 반환한다", async () => {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ blueprints: [{ code: "Q_ONE" }] }), { status: 200 }));

      await expect(apiGetRaw("/api/v1/quests/catalog")).resolves.toEqual({ blueprints: [{ code: "Q_ONE" }] });
    });
  });

  describe("method별 request body를 전송하면", () => {
    it("path-only DELETE는 body 없이 기존 동작을 유지한다", async () => {
      fetchMock.mockResolvedValueOnce(response(null));

      await apiDelete("/api/v1/roles/7");

      expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
        method: "DELETE",
        body: undefined,
      }));
    });

    it("DELETE body도 backend 계약 그대로 직렬화한다", async () => {
      fetchMock.mockResolvedValueOnce(response({ questCode: "Q_ONE" }));

      await apiDelete("/api/v1/players/quests/Q_ONE", { reason: "Changed direction" });

      expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({
        method: "DELETE",
        body: JSON.stringify({ reason: "Changed direction" }),
      }));
    });
  });

  describe("인증 metadata를 적용하면", () => {
    it("기본 요청에는 저장된 bearer를 자동으로 붙인다", async () => {
      tokenStorage.write(oldSession);
      fetchMock.mockResolvedValueOnce(response("ok"));

      await apiGet("/protected");

      const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
      expect(headers.get("Authorization")).toBe("Bearer old-access");
    });

    it("auth:false 요청에는 bearer를 붙이지 않는다", async () => {
      tokenStorage.write(oldSession);
      fetchMock.mockResolvedValueOnce(response("ok"));

      await apiPost("/api/v1/auth/login", {}, { auth: false });

      const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
      expect(headers.has("Authorization")).toBe(false);
    });
  });

  describe("인증 요청이 401이면", () => {
    it("refresh 후 원 요청을 새 bearer로 한 번만 재시도한다", async () => {
      tokenStorage.write(oldSession);
      fetchMock
        .mockResolvedValueOnce(response(null, 401, { isSuccess: false, code: "AUTH401", message: "Expired" }))
        .mockResolvedValueOnce(response(newSession))
        .mockResolvedValueOnce(response({ id: 9 }));

      await expect(apiGet("/protected")).resolves.toEqual({ id: 9 });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls[1][0]).toContain("/api/v1/auth/refresh");
      expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get("Authorization")).toBe("Bearer new-access");
    });

    it("재시도도 401이면 refresh를 반복하지 않는다", async () => {
      tokenStorage.write(oldSession);
      fetchMock
        .mockResolvedValueOnce(response(null, 401, { isSuccess: false }))
        .mockResolvedValueOnce(response(newSession))
        .mockResolvedValueOnce(response(null, 401, { isSuccess: false }));

      await expect(apiGet("/protected")).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith("/api/v1/auth/refresh"))).toHaveLength(1);
    });

    it("동시 401 여러 개에도 refresh는 하나만 실행한다", async () => {
      tokenStorage.write(oldSession);
      let refreshCalls = 0;
      fetchMock.mockImplementation(async (input, init) => {
        if (String(input).endsWith("/api/v1/auth/refresh")) {
          refreshCalls += 1;
          await Promise.resolve();
          return response(newSession);
        }
        const bearer = new Headers(init?.headers).get("Authorization");
        return bearer === "Bearer old-access"
          ? response(null, 401, { isSuccess: false })
          : response("ok");
      });

      await expect(Promise.all([apiGet("/one"), apiGet("/two")])).resolves.toEqual(["ok", "ok"]);
      expect(refreshCalls).toBe(1);
    });

    it("refresh 자체가 실패하면 재귀 호출 없이 storage를 비운다", async () => {
      tokenStorage.write(oldSession);
      fetchMock
        .mockResolvedValueOnce(response(null, 401, { isSuccess: false }))
        .mockResolvedValueOnce(response(null, 401, { isSuccess: false, code: "AUTH_REFRESH_EXPIRED" }));

      await expect(apiGet("/protected")).rejects.toMatchObject({ code: "AUTH_REFRESH_EXPIRED" });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(tokenStorage.read()).toBeNull();
    });
  });
});
