import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { InventoryEntriesResponse, InventoryEntry, MailboxEntriesResponse, MailEntry } from "@/shared/api/types";
import { useInventoryQueries } from "./useInventoryQueries";

const api = vi.hoisted(() => ({
  claimMailApi: vi.fn(),
  deleteMailApi: vi.fn(),
  getInventoryApi: vi.fn(),
  getMailboxApi: vi.fn(),
}));

vi.mock("@/lib/api/endpoints/inventory.api", () => api);

const item: InventoryEntry = {
  itemInstanceId: 501,
  slotIndex: 2,
  itemId: 101,
  itemName: "Server Sword",
  category: "WEAPON",
  type: "SWORD",
  rarity: "RARE",
  stackable: false,
  maxStack: 1,
  quantity: 1,
  bound: true,
  durability: 88,
  instanceAttrs: { atk: 12 },
};

const mail: MailEntry = {
  mailId: 701,
  slotIndex: 4,
  itemId: 301,
  itemName: "Server Potion",
  category: "CONSUMABLE",
  type: "POTION",
  rarity: "COMMON",
  stackable: true,
  maxStack: 99,
  quantity: 3,
  bound: false,
  durability: null,
  instanceAttrs: {},
};

const inventory: InventoryEntriesResponse = { entries: [item] };
const mailbox: MailboxEntriesResponse = { entries: [mail] };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

describe("Inventory server query state를 관리할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getInventoryApi.mockResolvedValue(inventory);
    api.getMailboxApi.mockResolvedValue(mailbox);
    api.claimMailApi.mockResolvedValue(undefined);
    api.deleteMailApi.mockResolvedValue(undefined);
  });

  describe("Claim 결과가 성공인지 확정되지 않으면", () => {
    it("중복 mutation을 막고 mailbox와 inventory를 모두 authoritative reload한다", async () => {
      const request = deferred<void>();
      api.claimMailApi.mockReturnValue(request.promise);
      const { result } = renderHook(() => useInventoryQueries());
      await waitFor(() => expect(result.current.mailbox.data).toEqual(mailbox));

      act(() => {
        void result.current.claimMail(mail);
        void result.current.claimMail(mail);
      });
      expect(api.claimMailApi).toHaveBeenCalledTimes(1);
      expect(result.current.mailbox.data.entries).toEqual([mail]);

      api.getInventoryApi.mockResolvedValue({ entries: [{ ...item, quantity: 2 }] });
      api.getMailboxApi.mockResolvedValue({ entries: [] });
      await act(async () => {
        request.reject(new Error("connection lost"));
        await request.promise.catch(() => undefined);
      });

      await waitFor(() => expect(result.current.pendingKey).toBeNull());
      expect(api.getInventoryApi).toHaveBeenCalledTimes(2);
      expect(api.getMailboxApi).toHaveBeenCalledTimes(2);
      expect(result.current.mailbox.data.entries).toEqual([]);
      expect(result.current.inventory.data.entries[0].quantity).toBe(2);
      expect(result.current.mutationError).toContain("Server state was reloaded");
    });
  });

  describe("Mail Delete를 수행하면", () => {
    it("요청 중에는 server entry를 유지하고 ambiguous failure 후에도 mailbox만 reload한다", async () => {
      const request = deferred<void>();
      api.deleteMailApi.mockReturnValue(request.promise);
      const { result } = renderHook(() => useInventoryQueries());
      await waitFor(() => expect(result.current.mailbox.data).toEqual(mailbox));

      act(() => { void result.current.deleteMail(mail); });
      expect(result.current.mailbox.data.entries).toEqual([mail]);
      api.getMailboxApi.mockResolvedValue({ entries: [] });
      await act(async () => {
        request.reject(new Error("delete response lost"));
        await request.promise.catch(() => undefined);
      });

      await waitFor(() => expect(result.current.mailbox.data.entries).toEqual([]));
      expect(api.deleteMailApi).toHaveBeenCalledWith({ slotIndex: 4 });
      expect(api.getMailboxApi).toHaveBeenCalledTimes(2);
      expect(api.getInventoryApi).toHaveBeenCalledTimes(1);
      expect(result.current.mutationError).toContain("Server state was reloaded");
    });
  });

  describe("겹친 list request가 역순으로 끝나면", () => {
    it("stale Inventory success가 최신 Items를 덮어쓰지 않는다", async () => {
      const stale = deferred<InventoryEntriesResponse>();
      const latest = deferred<InventoryEntriesResponse>();
      const latestInventory = { entries: [{ ...item, itemInstanceId: 999, itemName: "Latest Item" }] };
      api.getInventoryApi.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useInventoryQueries());
      await waitFor(() => expect(api.getInventoryApi).toHaveBeenCalledTimes(1));

      act(() => { void result.current.inventory.reload(); });
      await act(async () => {
        latest.resolve(latestInventory);
        await latest.promise;
      });
      expect(result.current.inventory.data).toEqual(latestInventory);

      await act(async () => {
        stale.resolve(inventory);
        await stale.promise;
      });
      expect(result.current.inventory.data).toEqual(latestInventory);
      expect(result.current.inventory.loading).toBe(false);
    });

    it("stale Mailbox error가 최신 Inbox의 data/loading/error를 바꾸지 않는다", async () => {
      const stale = deferred<MailboxEntriesResponse>();
      const latest = deferred<MailboxEntriesResponse>();
      const latestMailbox = { entries: [{ ...mail, mailId: 999, itemName: "Latest Mail" }] };
      api.getMailboxApi.mockReturnValueOnce(stale.promise).mockReturnValueOnce(latest.promise);
      const { result } = renderHook(() => useInventoryQueries());
      await waitFor(() => expect(api.getMailboxApi).toHaveBeenCalledTimes(1));

      act(() => { void result.current.mailbox.reload(); });
      await act(async () => {
        latest.resolve(latestMailbox);
        await latest.promise;
      });
      await act(async () => {
        stale.reject(new Error("stale mailbox failure"));
        await stale.promise.catch(() => undefined);
      });

      expect(result.current.mailbox.data).toEqual(latestMailbox);
      expect(result.current.mailbox.loading).toBe(false);
      expect(result.current.mailbox.error).toBeNull();
    });
  });
});
