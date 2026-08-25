import { describe, expect, it } from "vitest";

import type { AdminQuestAcceptanceStatus } from "../quest/model";
import {
  getMockAdminQuestAcceptance,
  getMockAdminQuestAcceptances,
  getMockAdminQuestCatalog,
  getMockAdminQuestDefinition,
  getMockAdminQuestDefinitions,
} from "./quest.mock";

describe("read-only Admin Quest Mock adapter", () => {
  it("returns deterministic DTO-only Blueprint, Definition, and Acceptance fixtures", async () => {
    const catalog = await getMockAdminQuestCatalog();
    const definitions = await getMockAdminQuestDefinitions();
    const definition = await getMockAdminQuestDefinition(definitions.definitions[0].code);
    const acceptances = await getMockAdminQuestAcceptances(definition.code);
    const acceptance = await getMockAdminQuestAcceptance(acceptances.acceptances[0].id);

    expect(catalog).toEqual(await getMockAdminQuestCatalog());
    expect(definitions.definitions).toHaveLength(2);
    expect(definition.code).toBe("quest:record:first-trace");
    expect(acceptance).toMatchObject({ id: 9001, questId: 501, playerId: 10218, code: definition.code, status: "IN_PROGRESS" });
    expect(acceptance).not.toHaveProperty("route");
    expect(acceptance).not.toHaveProperty("wallet");
    expect(acceptance).not.toHaveProperty("inventory");
    expect(acceptance).not.toHaveProperty("lifeLog");
    expect(acceptance).not.toHaveProperty("person");
    expect(acceptance).not.toHaveProperty("directChat");
    expect(acceptance).not.toHaveProperty("rewardRepair");
  });

  it("supports the proven status filter and an empty Acceptance list", async () => {
    expect((await getMockAdminQuestAcceptances(" quest:record:first-trace ", "COMPLETED")).acceptances).toEqual([
      expect.objectContaining({ id: 9002, status: "COMPLETED" }),
    ]);
    expect((await getMockAdminQuestAcceptances("quest:daily:walk")).acceptances).toEqual([]);
    expect((await getMockAdminQuestDefinition(" quest:record:first-trace ")).code).toBe("quest:record:first-trace");
  });

  it("reports not-found without fabricating fallback data", async () => {
    await expect(getMockAdminQuestDefinition("missing")).rejects.toMatchObject({ status: 404 });
    await expect(getMockAdminQuestAcceptances("missing")).rejects.toMatchObject({ status: 404 });
    await expect(getMockAdminQuestAcceptance(9999)).rejects.toMatchObject({ status: 404 });
  });

  it.each([
    [() => getMockAdminQuestDefinition("   "), "must not be blank"],
    [() => getMockAdminQuestAcceptances(""), "must not be blank"],
    [() => getMockAdminQuestAcceptance(0), "positive integer"],
    [() => getMockAdminQuestAcceptance(-1), "positive integer"],
    [() => getMockAdminQuestAcceptances("quest:record:first-trace", "DONE" as unknown as AdminQuestAcceptanceStatus), "canonical Acceptance status"],
  ])("rejects the same invalid input as the API source", async (request, message) => {
    await expect(request()).rejects.toThrow(message);
  });
});
