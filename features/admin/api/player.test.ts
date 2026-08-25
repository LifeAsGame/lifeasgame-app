import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAdminPlayerById, lookupAdminPlayerByUserId } from "./player";

const client = vi.hoisted(() => ({ apiGet: vi.fn() }));
vi.mock("@/shared/api/client", () => client);

describe("canonical Admin Player API adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.apiGet.mockResolvedValue({});
  });

  it("uses the exact userId lookup and playerId detail endpoints", async () => {
    await lookupAdminPlayerByUserId(8314);
    await getAdminPlayerById(10218);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/admin/v1/players?userId=8314");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/admin/v1/players/10218");
    expect(client.apiGet.mock.calls.flat().join(" ")).not.toContain("/api/v1/admin/");
  });

  it.each([
    ["userId", () => lookupAdminPlayerByUserId(0)],
    ["playerId", () => getAdminPlayerById(-1)],
    ["playerId", () => getAdminPlayerById(1.5)],
  ])("rejects invalid %s values through its Promise contract", async (_field, request) => {
    const result = request();

    expect(result).toBeInstanceOf(Promise);
    await expect(result).rejects.toThrow("positive integer");
    expect(client.apiGet).not.toHaveBeenCalled();
  });
});
