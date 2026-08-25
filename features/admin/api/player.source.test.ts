import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminPlayerDataSource } from "./player.source";

const api = vi.hoisted(() => ({ lookup: vi.fn(), detail: vi.fn() }));
const mock = vi.hoisted(() => ({ lookup: vi.fn(), detail: vi.fn() }));
vi.mock("./player", () => ({ lookupAdminPlayerByUserId: api.lookup, getAdminPlayerById: api.detail }));
vi.mock("./player.mock", () => ({ lookupMockAdminPlayerByUserId: mock.lookup, getMockAdminPlayerById: mock.detail }));

describe("Admin Player data-source selector", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [undefined, "api"],
    ["api", "api"],
    ["mock", "mock"],
    ["invalid", "api"],
  ] as const)("resolves %s to %s using the shared Admin mode rule", (value, expected) => {
    expect(getAdminPlayerDataSource(value).descriptor.mode).toBe(expected);
  });

  it("exposes truthful Player source labels", () => {
    expect(getAdminPlayerDataSource("api").descriptor).toEqual({ mode: "api", badge: "API", label: "/admin/v1", playerLabel: "/admin/v1/players" });
    expect(getAdminPlayerDataSource("mock").descriptor).toEqual({ mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", playerLabel: "Local Admin Mock" });
  });

  it("does not fall back to Mock when the API source fails", async () => {
    api.lookup.mockRejectedValueOnce(new Error("API unavailable"));
    await expect(getAdminPlayerDataSource("api").lookupByUserId(8314)).rejects.toThrow("API unavailable");
    expect(mock.lookup).not.toHaveBeenCalled();
  });
});
