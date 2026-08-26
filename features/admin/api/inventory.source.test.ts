import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "@/shared/api/client";
import {
  getAdminInventoryOperationsDataSource,
  getAdminItem,
  getAdminPlayerInventory,
  getAdminPlayerMailbox,
  searchAdminItems,
} from "./inventory.source";

vi.mock("@/shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/client")>();
  return { ...actual, apiGet: vi.fn() };
});

describe("Admin Inventory operations read source", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the exact four GET routes and server search filters", async () => {
    vi.mocked(client.apiGet)
      .mockResolvedValueOnce({ content: [], page: 2, size: 25, totalElements: 0, totalPages: 0 })
      .mockResolvedValueOnce({ id: 44 })
      .mockResolvedValueOnce({ playerId: 10218, entries: [] })
      .mockResolvedValueOnce({ playerId: 10218, entries: [] });

    await searchAdminItems({ name: "Potion & Flask", category: "CONSUMABLE", type: "POTION", rarity: "RARE", page: 2, size: 25 });
    await getAdminItem(44);
    await getAdminPlayerInventory(10218);
    await getAdminPlayerMailbox(10218);

    expect(client.apiGet).toHaveBeenNthCalledWith(1, "/admin/v1/items?name=Potion+%26+Flask&category=CONSUMABLE&type=POTION&rarity=RARE&page=2&size=25");
    expect(client.apiGet).toHaveBeenNthCalledWith(2, "/admin/v1/items/44");
    expect(client.apiGet).toHaveBeenNthCalledWith(3, "/admin/v1/players/10218/inventory");
    expect(client.apiGet).toHaveBeenNthCalledWith(4, "/admin/v1/players/10218/mailbox");
  });

  it("fails closed on Item and destination identity mismatches", async () => {
    vi.mocked(client.apiGet)
      .mockResolvedValueOnce({ id: 45 })
      .mockResolvedValueOnce({ playerId: 99999, entries: [] })
      .mockResolvedValueOnce({ playerId: 99999, entries: [] });

    await expect(getAdminItem(44)).rejects.toThrow("requested Item ID");
    await expect(getAdminPlayerInventory(10218)).rejects.toThrow("requested Player ID");
    await expect(getAdminPlayerMailbox(10218)).rejects.toThrow("requested Player ID");
  });

  it("keeps API failures authoritative and Mock reads deterministic", async () => {
    vi.mocked(client.apiGet).mockRejectedValueOnce(new Error("API unavailable"));
    await expect(getAdminInventoryOperationsDataSource("api").getInventory(10218)).rejects.toThrow("API unavailable");

    const mock = getAdminInventoryOperationsDataSource("mock");
    expect(mock.descriptor.mode).toBe("mock");
    await expect(mock.getInventory(10218)).resolves.toMatchObject({ playerId: 10218, entries: [{ itemId: 1201 }] });
    await expect(mock.getMailbox(10218)).resolves.toMatchObject({ playerId: 10218, entries: [{ itemId: 3307 }] });
    await expect(mock.searchItems({ name: "Health", page: 0, size: 20 })).resolves.toMatchObject({ totalElements: 1, content: [{ id: 1201 }] });
  });

  it("uses only canonical Mock enums and strict Backend-style enum filters", async () => {
    const mock = getAdminInventoryOperationsDataSource("mock");
    const all = await mock.searchItems({ page: 0, size: 20 });
    expect(all.content).toEqual(expect.arrayContaining([
      expect.objectContaining({ category: "CONSUMABLE", type: "POTION", rarity: "COMMON" }),
      expect.objectContaining({ category: "WEAPON", type: "SWORD", rarity: "UNCOMMON" }),
      expect.objectContaining({ category: "ACCESSORY", type: "ETC", rarity: "RARE" }),
    ]));
    await expect(mock.searchItems({ category: "  consumable  ", page: 0, size: 20 })).resolves.toMatchObject({ totalElements: 1, content: [{ id: 1201 }] });
    await expect(mock.searchItems({ category: "CONS", page: 0, size: 20 })).rejects.toThrow("Invalid Item category");
    await expect(mock.searchItems({ type: "CHARM", page: 0, size: 20 })).rejects.toThrow("Invalid Item type");
    await expect(mock.searchItems({ name: "otion", page: 0, size: 20 })).resolves.toMatchObject({ totalElements: 1, content: [{ name: "Health Potion" }] });
    await expect(mock.getMailbox(10218)).resolves.toMatchObject({ entries: [{ category: "ACCESSORY", type: "ETC", rarity: "RARE" }] });
  });

  it("bounds paging and keeps removed raw attributes out of production models", async () => {
    await expect(searchAdminItems({ page: -1 })).rejects.toThrow("non-negative integer");
    await expect(searchAdminItems({ size: 101 })).rejects.toThrow("1 to 100");
    const production = readFileSync("features/admin/api/inventory.source.ts", "utf8");
    expect(production).not.toContain("instanceAttrs");
  });
});
