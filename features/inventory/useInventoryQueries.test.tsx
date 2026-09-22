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

  it("confirmed Claim 뒤 list GET 실패는 재전송 없이 조회만 다시 시도한다", async () => {
    const { result } = renderHook(() => useInventoryQueries());
    await waitFor(() => expect(result.current.mailbox.data).toEqual(mailbox));
    api.getMailboxApi.mockRejectedValueOnce(new Error("Mailbox GET failed")).mockResolvedValueOnce({ entries: [] });
    api.getInventoryApi.mockResolvedValue({ entries: [{ ...item, quantity: 2 }] });

    await act(async () => { await result.current.claimMail(mail); });
    expect(result.current.confirmedClaimMailIds.has(mail.mailId)).toBe(true);
    expect(result.current.mutationError).toContain("Claim succeeded");
    expect(result.current.mailbox.data.entries).toEqual([mail]);
    expect(result.current.mailbox.error).toBe("Mailbox GET failed");

    await act(async () => {
      await result.current.claimMail(mail);
      await result.current.retryClaimRecovery();
    });
    expect(api.claimMailApi).toHaveBeenCalledTimes(1);
    expect(result.current.mutationError).toBeNull();
    expect(result.current.mailbox.data.entries).toEqual([]);
    expect(result.current.inventory.data.entries[0].quantity).toBe(2);
  });

  it("confirmed Claim 뒤 Inventory GET만 실패해도 Mailbox 성공과 수령 상태를 유지한다", async () => {
    const { result } = renderHook(() => useInventoryQueries());
    await waitFor(() => expect(result.current.mailbox.data).toEqual(mailbox));
    api.getMailboxApi.mockResolvedValue({ entries: [] });
    api.getInventoryApi.mockRejectedValueOnce(new Error("Inventory GET failed")).mockResolvedValueOnce({ entries: [{ ...item, quantity: 2 }] });

    await act(async () => { await result.current.claimMail(mail); });
    expect(result.current.mailbox.data.entries).toEqual([]);
    expect(result.current.claimRecoveryNeeded).toBe(true);
    expect(result.current.mutationError).toContain("Claim succeeded");

    await act(async () => { await result.current.retryClaimRecovery(); });
    expect(api.claimMailApi).toHaveBeenCalledTimes(1);
    expect(result.current.claimRecoveryNeeded).toBe(false);
    expect(result.current.inventory.data.entries[0].quantity).toBe(2);
  });

  it("two confirmed mails cannot make the first stale Claim available again", async () => {
    const secondMail = { ...mail, mailId: 702, slotIndex: 5 };
    api.getMailboxApi.mockResolvedValue({ entries: [mail, secondMail] });
    const { result } = renderHook(() => useInventoryQueries());
    await waitFor(() => expect(result.current.mailbox.data.entries).toHaveLength(2));

    api.getMailboxApi.mockRejectedValueOnce(new Error("Mailbox GET failed"));
    await act(async () => { await result.current.claimMail(mail); });
    await act(async () => {
      await result.current.claimMail(secondMail);
      await result.current.deleteMail(secondMail);
    });
    expect(api.claimMailApi).toHaveBeenCalledTimes(1);
    expect(api.deleteMailApi).not.toHaveBeenCalled();

    await act(async () => { await result.current.retryClaimRecovery(); });
    expect(result.current.claimRecoveryNeeded).toBe(false);
    expect(result.current.confirmedClaimMailIds.has(mail.mailId)).toBe(true);
    api.getMailboxApi.mockRejectedValueOnce(new Error("Mailbox GET failed again"));
    await act(async () => { await result.current.claimMail(secondMail); });
    await act(async () => { await result.current.claimMail(mail); });
    expect(api.claimMailApi).toHaveBeenCalledTimes(2);
    expect(api.claimMailApi).toHaveBeenNthCalledWith(2, { slotIndex: 5, quantity: 3 });
  });

  it("an invalidated Retry success cannot clear a newer Mailbox failure", async () => {
    const { result } = renderHook(() => useInventoryQueries());
    await waitFor(() => expect(result.current.mailbox.data).toEqual(mailbox));
    api.getMailboxApi.mockRejectedValueOnce(new Error("initial Mailbox failure"));
    await act(async () => { await result.current.claimMail(mail); });
    expect(result.current.claimRecoveryNeeded).toBe(true);

    const stale = deferred<MailboxEntriesResponse>();
    api.getMailboxApi.mockReturnValueOnce(stale.promise).mockRejectedValueOnce(new Error("latest Mailbox failure"));
    let firstRetry!: Promise<void>;
    act(() => { firstRetry = result.current.retryClaimRecovery(); });
    await waitFor(() => expect(api.getMailboxApi).toHaveBeenCalledTimes(3));
    await act(async () => { await result.current.retryClaimRecovery(); });
    await act(async () => {
      stale.resolve({ entries: [] });
      await firstRetry;
    });

    expect(result.current.mailbox.data).toEqual(mailbox);
    expect(result.current.mailbox.error).toBe("latest Mailbox failure");
    expect(result.current.claimRecoveryNeeded).toBe(true);
    expect(result.current.mutationError).toContain("Claim succeeded");
    expect(api.claimMailApi).toHaveBeenCalledTimes(1);
  });

  it("a normal Refresh invalidates an older Retry and a valid pair restores actions", async () => {
    const secondMail = { ...mail, mailId: 702, slotIndex: 5 };
    api.getMailboxApi.mockResolvedValue({ entries: [mail, secondMail] });
    const { result } = renderHook(() => useInventoryQueries());
    await waitFor(() => expect(result.current.mailbox.data.entries).toHaveLength(2));
    api.getMailboxApi.mockRejectedValueOnce(new Error("claim refresh failed"));
    await act(async () => { await result.current.claimMail(mail); });

    const stale = deferred<MailboxEntriesResponse>();
    api.getMailboxApi.mockReturnValueOnce(stale.promise).mockRejectedValueOnce(new Error("manual Refresh failed"));
    let retry!: Promise<void>;
    act(() => { retry = result.current.retryClaimRecovery(); });
    await waitFor(() => expect(api.getMailboxApi).toHaveBeenCalledTimes(3));
    await act(async () => { await result.current.mailbox.reload(); });
    await act(async () => {
      stale.resolve({ entries: [] });
      await retry;
    });
    expect(result.current.claimRecoveryNeeded).toBe(true);
    expect(result.current.mailbox.error).toBe("manual Refresh failed");

    api.getMailboxApi.mockResolvedValue({ entries: [secondMail] });
    await act(async () => { await result.current.retryClaimRecovery(); });
    expect(result.current.claimRecoveryNeeded).toBe(false);
    expect(result.current.confirmedClaimMailIds.size).toBe(0);
    await act(async () => { await result.current.claimMail(secondMail); });
    expect(api.claimMailApi).toHaveBeenCalledTimes(2);
  });

  it.each(["mailbox", "inventory"] as const)(
    "a completed %s Retry read invalidated while its peer is pending cannot finish recovery",
    async (first) => {
      const secondMail = { ...mail, mailId: 702, slotIndex: 5 };
      const thirdMail = { ...mail, mailId: 703, slotIndex: 6 };
      const remainingMailbox = { entries: [secondMail, thirdMail] };
      api.getMailboxApi.mockResolvedValue({ entries: [mail, secondMail, thirdMail] });
      const { result } = renderHook(() => useInventoryQueries());
      await waitFor(() => expect(result.current.mailbox.data.entries).toHaveLength(3));
      api.getMailboxApi.mockRejectedValueOnce(new Error("claim refresh failed"));
      await act(async () => { await result.current.claimMail(mail); });
      expect(result.current.claimRecoveryNeeded).toBe(true);
      const recoveryError = result.current.mutationError;

      const mailboxRead = deferred<MailboxEntriesResponse>();
      const inventoryRead = deferred<InventoryEntriesResponse>();
      api.getMailboxApi.mockReturnValueOnce(mailboxRead.promise);
      api.getInventoryApi.mockReturnValueOnce(inventoryRead.promise);
      let retry!: Promise<void>;
      act(() => { retry = result.current.retryClaimRecovery(); });
      await act(async () => {
        if (first === "mailbox") mailboxRead.resolve(remainingMailbox);
        else inventoryRead.resolve(inventory);
      });
      expect(result.current[first].loading).toBe(false);
      expect(result.current[first === "mailbox" ? "inventory" : "mailbox"].loading).toBe(true);

      const refreshedApi = first === "mailbox" ? api.getMailboxApi : api.getInventoryApi;
      refreshedApi.mockRejectedValueOnce(new Error("manual Refresh failed"));
      await act(async () => { await result.current[first].reload(); });
      await act(async () => {
        if (first === "mailbox") inventoryRead.resolve(inventory);
        else mailboxRead.resolve(remainingMailbox);
        await retry;
      });

      expect(result.current[first].error).toBe("manual Refresh failed");
      expect(result.current.claimRecoveryNeeded).toBe(true);
      expect(result.current.mutationError).toBe(recoveryError);
      expect(result.current.confirmedClaimMailIds).toEqual(new Set([mail.mailId]));
      await act(async () => {
        await result.current.claimMail(mail);
        await result.current.claimMail(secondMail);
        await result.current.deleteMail(thirdMail);
      });
      expect(api.claimMailApi).toHaveBeenCalledTimes(1);
      expect(api.deleteMailApi).not.toHaveBeenCalled();

      api.getMailboxApi.mockResolvedValue(remainingMailbox);
      await act(async () => { await result.current.retryClaimRecovery(); });
      expect(result.current.mailbox.error).toBeNull();
      expect(result.current.inventory.error).toBeNull();
      expect(result.current.claimRecoveryNeeded).toBe(false);
      expect(result.current.mutationError).toBeNull();
      expect(result.current.confirmedClaimMailIds.size).toBe(0);
      expect(api.getMailboxApi).toHaveBeenCalledTimes(first === "mailbox" ? 5 : 4);
      expect(api.getInventoryApi).toHaveBeenCalledTimes(first === "inventory" ? 5 : 4);
      expect(api.claimMailApi).toHaveBeenCalledTimes(1);
      expect(api.deleteMailApi).not.toHaveBeenCalled();

      await act(async () => { await result.current.claimMail(secondMail); });
      await act(async () => { await result.current.deleteMail(thirdMail); });
      expect(api.claimMailApi).toHaveBeenCalledTimes(2);
      expect(api.claimMailApi).toHaveBeenLastCalledWith({ slotIndex: 5, quantity: 3 });
      expect(api.deleteMailApi).toHaveBeenCalledWith({ slotIndex: 6 });
    },
  );

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
