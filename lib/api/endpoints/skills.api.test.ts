import { beforeEach, describe, expect, it, vi } from "vitest";

import { getPlayerSkillsApi, getSkillCatalogApi } from "./skills.api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn(), apiDelete: vi.fn() }));
vi.mock("../client", () => ({ USE_MOCK: false, ...client }));

describe("Skills API adapters", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the existing authenticated catalog/player paths and unwraps their DTO lists", async () => {
    client.apiGet.mockResolvedValueOnce({ skills: [{ code: "GUARD" }] }).mockResolvedValueOnce({ skills: [{ id: 7 }] });

    await expect(getSkillCatalogApi()).resolves.toEqual([{ code: "GUARD" }]);
    await expect(getPlayerSkillsApi()).resolves.toEqual([{ id: 7 }]);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/skills/catalog");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/players/skills");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toMatch(/playerId|userId|\/players\/me\/skills/);
  });
});
