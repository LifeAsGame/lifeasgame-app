import { beforeEach, describe, expect, it, vi } from "vitest";
import { bootstrapDemo } from "./api";
import { DEMO_ENABLED } from "./config";
import { demoStorage } from "./storage";
import { DEMO_TOKEN_STORAGE_KEY, TOKEN_STORAGE_KEY, tokenStorage } from "@/shared/api/tokenStorage";

describe("disabled portfolio demo", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it("keeps an ordinary session while discarding a stale demo session and navigation state", () => {
    expect(DEMO_ENABLED).toBe(false);
    const ordinary = { accessToken: "ordinary", refreshToken: "ordinary-r", userId: 1, playerId: 1 };
    window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(ordinary));
    window.sessionStorage.setItem(DEMO_TOKEN_STORAGE_KEY, JSON.stringify({ accessToken: "demo", refreshToken: "demo-r", userId: 2, playerId: 2 }));
    window.sessionStorage.setItem("lag_demo_state", JSON.stringify({ actor: "explorer" }));
    window.sessionStorage.setItem("lag_demo_start_intent", "1");
    window.sessionStorage.setItem("lag_demo_attempt", "old");
    window.sessionStorage.setItem("lag_demo_flow", "marketplace");

    expect(demoStorage.read()).toBeNull();
    expect(tokenStorage.read()).toEqual(ordinary);
    expect(window.sessionStorage.length).toBe(0);
  });

  it("rejects demo bootstrap before sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(bootstrapDemo()).rejects.toMatchObject({ code: "DEMO-DISABLED" });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
