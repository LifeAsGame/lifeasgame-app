import { describe, expect, it } from "vitest";

import { getMockAdminPlayerById, lookupMockAdminPlayerByUserId } from "./player.mock";

describe("read-only Admin Player mock adapter", () => {
  it("returns deterministic Summary and PlayerInfo with only proven DTO fields", async () => {
    const summary = await lookupMockAdminPlayerByUserId(8314);
    const detail = await getMockAdminPlayerById(summary.playerId);

    expect(summary).toEqual({ playerId: 10218, userId: 8314, name: "HANEUL" });
    expect(Object.keys(detail)).toEqual([
      "playerId", "name", "gender", "job", "level", "totalExp", "currentHealth", "healthCapacity", "currentMana", "manaCapacity",
      "str", "agi", "dex", "intel", "vit", "luc", "effects", "representativeTitleId",
    ]);
    expect(detail.effects).toEqual([{ code: "FOCUSED", category: "BUFF" }]);
    expect(detail).not.toHaveProperty("wallet");
    expect(detail).not.toHaveProperty("inventory");
    expect(detail).not.toHaveProperty("lifeLog");
    expect(detail).not.toHaveProperty("person");
    expect(detail).not.toHaveProperty("directChat");
  });

  it("returns the same deterministic value and reports not-found without fake fallback data", async () => {
    expect(await lookupMockAdminPlayerByUserId(8314)).toEqual(await lookupMockAdminPlayerByUserId(8314));
    await expect(lookupMockAdminPlayerByUserId(9999)).rejects.toMatchObject({ status: 404 });
    await expect(getMockAdminPlayerById(9999)).rejects.toMatchObject({ status: 404 });
  });
});
