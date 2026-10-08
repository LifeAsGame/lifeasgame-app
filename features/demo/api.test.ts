import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { tokenStorage } from "@/shared/api/tokenStorage";
import { apiGet } from "@/shared/api/client";
import { bootstrapDemo, startDemo } from "./api";

const envelope = (result: unknown) => new Response(JSON.stringify({ isSuccess: true, code: "COMMON-200", message: "ok", result }), { status: 200, headers: { "Content-Type": "application/json" } });

describe("체험 인증 경계", () => {
  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.clear(); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it("증명과 같은 시도 키를 보내되 일반 로그인 토큰은 보내지 않는다", async () => {
    tokenStorage.write({ accessToken: "ordinary", refreshToken: "refresh", userId: 1, playerId: 1 });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(envelope({ templateVersion: "portfolio-v1", proof: "secret", expiresAt: "later" }))
      .mockResolvedValueOnce(envelope({ runId: "run", status: "PROVISIONING" }));
    vi.stubGlobal("fetch", fetchMock);

    await bootstrapDemo();
    await startDemo("secret", "attempt-1");

    const options = fetchMock.mock.calls[1][1] as RequestInit;
    const headers = new Headers(options.headers);
    expect(options.credentials).toBe("include");
    expect(headers.get("X-Demo-Proof")).toBe("secret");
    expect(headers.get("Idempotency-Key")).toBe("attempt-1");
    expect(headers.has("Authorization")).toBe(false);
  });

  it("역할이 바뀐 뒤 돌아온 이전 actor의 읽기 응답을 폐기한다", async () => {
    tokenStorage.writeDemo({ accessToken: "old", refreshToken: "old-r", userId: 2, playerId: 2 });
    let finish!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => { finish = resolve; })));
    const oldRequest = apiGet("/api/v1/users/me");
    tokenStorage.writeDemo({ accessToken: "new", refreshToken: "new-r", userId: 3, playerId: 3 });
    finish(envelope({ user: { id: 2 } }));
    await expect(oldRequest).rejects.toMatchObject({ code: "SESSION_CHANGED" });
  });
});
