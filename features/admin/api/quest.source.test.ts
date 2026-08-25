import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminQuestDataSource } from "./quest.source";

const api = vi.hoisted(() => ({ catalog: vi.fn(), definitions: vi.fn(), definition: vi.fn(), acceptances: vi.fn(), acceptance: vi.fn() }));
const mock = vi.hoisted(() => ({ catalog: vi.fn(), definitions: vi.fn(), definition: vi.fn(), acceptances: vi.fn(), acceptance: vi.fn() }));
vi.mock("./quest", () => ({
  getAdminQuestCatalog: api.catalog, getAdminQuestDefinitions: api.definitions, getAdminQuestDefinition: api.definition,
  getAdminQuestAcceptances: api.acceptances, getAdminQuestAcceptance: api.acceptance,
}));
vi.mock("./quest.mock", () => ({
  getMockAdminQuestCatalog: mock.catalog, getMockAdminQuestDefinitions: mock.definitions, getMockAdminQuestDefinition: mock.definition,
  getMockAdminQuestAcceptances: mock.acceptances, getMockAdminQuestAcceptance: mock.acceptance,
}));

describe("Admin Quest data-source selector", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [undefined, "api"], ["api", "api"], ["mock", "mock"], ["invalid", "api"],
  ] as const)("resolves %s to %s using the shared Admin mode rule", (value, expected) => {
    expect(getAdminQuestDataSource(value).descriptor.mode).toBe(expected);
  });

  it("exposes truthful Quest source labels", () => {
    expect(getAdminQuestDataSource("api").descriptor).toEqual({ mode: "api", badge: "API", label: "/admin/v1", questLabel: "/admin/v1/quests" });
    expect(getAdminQuestDataSource("mock").descriptor).toEqual({ mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", questLabel: "Local Admin Mock" });
  });

  it("does not fall back to Mock when the API source fails", async () => {
    api.catalog.mockRejectedValueOnce(new Error("API unavailable"));
    await expect(getAdminQuestDataSource("api").getCatalog()).rejects.toThrow("API unavailable");
    expect(mock.catalog).not.toHaveBeenCalled();
  });
});
