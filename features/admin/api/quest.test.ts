import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getAdminQuestAcceptance,
  getAdminQuestAcceptances,
  getAdminQuestCatalog,
  getAdminQuestDefinition,
  getAdminQuestDefinitions,
} from "./quest";

const client = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/shared/api/client", () => client);

describe("read-only Admin Quest API adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({});
  });

  it("uses the exact five GET endpoint forms with safe path and query encoding", async () => {
    await getAdminQuestCatalog();
    await getAdminQuestDefinitions();
    await getAdminQuestDefinition("quest/with space");
    await getAdminQuestAcceptances("quest/with space");
    await getAdminQuestAcceptances("quest/with space", "GOAL_REACHED");
    await getAdminQuestAcceptance(9001);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/admin/v1/quests/catalog");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/admin/v1/quests/definitions");
    expect(client.apiGet).toHaveBeenNthCalledWith(3, "/admin/v1/quests/definitions/quest%2Fwith%20space");
    expect(client.apiGet).toHaveBeenNthCalledWith(4, "/admin/v1/quests/quest%2Fwith%20space/acceptances");
    expect(client.apiGet).toHaveBeenNthCalledWith(5, "/admin/v1/quests/quest%2Fwith%20space/acceptances?status=GOAL_REACHED");
    expect(client.apiGet).toHaveBeenNthCalledWith(6, "/admin/v1/quests/acceptances/9001");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toContain("/api/v1/admin/");
  });

  it("rejects blank Quest codes and invalid Acceptance IDs before a request", () => {
    expect(() => getAdminQuestDefinition("   ")).toThrow("must not be blank");
    expect(() => getAdminQuestAcceptances("")).toThrow("must not be blank");
    expect(() => getAdminQuestAcceptance(0)).toThrow("positive integer");
    expect(() => getAdminQuestAcceptance(1.5)).toThrow("positive integer");
    expect(client.apiGet).not.toHaveBeenCalled();
  });

  it("contains no mutation transport", () => {
    const source = readFileSync("features/admin/api/quest.ts", "utf8");
    expect(source).not.toMatch(/apiPatch|apiPost|apiPut|apiDelete|\/progress|\/status/);
  });
});
