import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  claimMailApi,
  deleteMailApi,
  getInventoryApi,
  getMailboxApi,
} from "./inventory.api";
import { inventoryMock } from "../mock/inventory.mock";

const client = vi.hoisted(() => ({
  apiDelete: vi.fn(),
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Inventory와 Mailbox를 실제 backend에 연결할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inventoryMock.reset();
  });

  describe("현재 player의 Items와 Inbox를 조회하면", () => {
    it("identity query나 /inventory/me 없이 canonical list endpoint를 사용한다", async () => {
      client.apiGet.mockResolvedValue({ entries: [] });

      await getInventoryApi();
      await getMailboxApi();

      expect(client.apiGet).toHaveBeenNthCalledWith(1, "/api/v1/inventory");
      expect(client.apiGet).toHaveBeenNthCalledWith(2, "/api/v1/mailbox");
      expect(client.apiGet.mock.calls.flat().join(" ")).not.toContain("/inventory/me");
    });
  });

  describe("Inbox entry를 변경하면", () => {
    it("claim은 authoritative slotIndex와 quantity를 JSON body로 보낸다", async () => {
      client.apiPost.mockResolvedValue(undefined);

      await claimMailApi({ slotIndex: 4, quantity: 3 });

      expect(client.apiPost).toHaveBeenCalledWith("/api/v1/mailbox/claim", { slotIndex: 4, quantity: 3 });
    });

    it("delete는 query string 대신 verified DELETE body를 보낸다", async () => {
      client.apiDelete.mockResolvedValue(undefined);

      await deleteMailApi({ slotIndex: 7 });

      expect(client.apiDelete).toHaveBeenCalledWith("/api/v1/mailbox", { slotIndex: 7 });
      expect(client.apiDelete.mock.calls[0][0]).not.toContain("?");
    });
  });

  describe("mock mode contract를 사용하면", () => {
    it("Inventory와 Mailbox list를 meta 없이 real entries shape로 제공한다", () => {
      const inventory = inventoryMock.inventory();
      const mailbox = inventoryMock.mailbox();

      expect(Object.keys(inventory)).toEqual(["entries"]);
      expect(Object.keys(mailbox)).toEqual(["entries"]);
      expect(inventory.entries[0]).toEqual(expect.objectContaining({
        itemInstanceId: expect.any(Number),
        slotIndex: expect.any(Number),
        durability: expect.any(Number),
        instanceAttrs: expect.any(Object),
      }));
      expect(mailbox.entries[0]).toEqual(expect.objectContaining({
        mailId: expect.any(Number),
        slotIndex: expect.any(Number),
        durability: null,
        instanceAttrs: expect.any(Object),
      }));
    });
  });
});
