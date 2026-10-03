import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/shared/api/client";
import type { ChatMessage, ChatMessagePage, FriendChatChannel } from "@/shared/api/types";
import { useDirectChat } from "./useDirectChat";

const api = vi.hoisted(() => ({
  getFriendChannelsApi: vi.fn(),
  getFriendMessagesApi: vi.fn(),
  openFriendChannelApi: vi.fn(),
  sendFriendMessageApi: vi.fn(),
}));
const realtime = vi.hoisted(() => ({ connectFriendChat: vi.fn((...args: [number[], (event: unknown) => void, (status: string) => void, () => void]) => { void args; return vi.fn(); }) }));
vi.mock("./api", () => api);
vi.mock("./realtime", () => realtime);

const channels: FriendChatChannel[] = [
  { channelId: 10, peer: { playerId: 70, name: "A", job: null, level: 1 }, readOnly: false },
  { channelId: 20, peer: { playerId: 80, name: "B", job: "Mage", level: 2 }, readOnly: false },
];
const message = (id: number, channelId = 10): ChatMessage => ({ id, channelId, senderId: 6, content: `m${id}`, edited: false, createdAt: "2026-08-18T00:00:00Z" });
const page = (messages: ChatMessage[], hasMore = false, nextCursor: number | null = null): ChatMessagePage => ({ messages, hasMore, nextCursor });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

const blocked = () => new ApiError(403, "SOC-403-CHAT-DIRECT-BLOCKED", "Forbidden");

describe("feature-owned Direct Friend Chat state", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    realtime.connectFriendChat.mockImplementation(() => vi.fn());
    api.getFriendChannelsApi.mockResolvedValue(channels);
    api.getFriendMessagesApi.mockResolvedValue(page([]));
  });

  it("ignores stale channel results when selection changes", async () => {
    const a = deferred<ChatMessagePage>();
    const b = deferred<ChatMessagePage>();
    api.getFriendMessagesApi.mockImplementation((channelId: number) => channelId === 10 ? a.promise : b.promise);
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));

    act(() => { void result.current.selectChannel(10); });
    act(() => { void result.current.selectChannel(20); });
    await act(async () => { b.resolve(page([message(2, 20)])); await b.promise; });
    await act(async () => { a.resolve(page([message(1, 10)])); await a.promise; });

    expect(result.current.selectedChannelId).toBe(20);
    expect(result.current.messages.map(({ id }) => id)).toEqual([2]);
  });

  it("keeps a newer saved message when a stale latest snapshot finishes", async () => {
    const latest = deferred<ChatMessagePage>();
    api.getFriendMessagesApi.mockResolvedValueOnce(page([message(1)])).mockReturnValueOnce(latest.promise);
    api.sendFriendMessageApi.mockResolvedValue(message(3));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });

    act(() => { void result.current.loadLatest(); });
    act(() => result.current.setDraft("new"));
    await act(async () => { await result.current.send(); });
    await act(async () => { latest.resolve(page([message(2), message(1)])); await latest.promise; });

    expect(result.current.messages.map(({ id }) => id)).toEqual([1, 2, 3]);
  });

  it("follows recovery cursors across more than one page after reconnect", async () => {
    api.getFriendMessagesApi
      .mockResolvedValueOnce(page([message(50)]))
      .mockResolvedValueOnce(page([message(100), message(99)], true, 99))
      .mockResolvedValueOnce(page([message(98), message(50)], true, 50))
      .mockResolvedValueOnce(page([message(49)], false));
    const { result } = renderHook(() => useDirectChat(1, 6));
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setOpen(true));
    await waitFor(() => expect(realtime.connectFriendChat).toHaveBeenCalled());
    const onConnected = realtime.connectFriendChat.mock.calls.at(-1)![3];
    await act(async () => { onConnected(); });
    await waitFor(() => expect(result.current.messages.map(({ id }) => id)).toEqual([49, 50, 98, 99, 100]));
    expect(api.getFriendMessagesApi).toHaveBeenNthCalledWith(2, 10, null, 50);
    expect(api.getFriendMessagesApi).toHaveBeenNthCalledWith(3, 10, 99, 50);
    expect(api.getFriendMessagesApi).toHaveBeenNthCalledWith(4, 10, 50, 50);
  });

  it("keeps a newer deliberate channel selection when an older friend-open finishes", async () => {
    const opened = deferred<{ id: number; type: "FRIEND"; name: string; contextId: null; readOnly: boolean; role: "MEMBER" }>();
    const canonical = deferred<FriendChatChannel[]>();
    api.openFriendChannelApi.mockReturnValue(opened.promise);
    api.getFriendChannelsApi.mockResolvedValueOnce(channels).mockReturnValueOnce(canonical.promise);
    api.getFriendMessagesApi.mockImplementation((channelId: number) => Promise.resolve(page([message(channelId, channelId)])));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));

    let opening!: Promise<void>;
    act(() => { opening = result.current.openFriendChat(70); });
    await act(async () => { await result.current.selectChannel(20); });
    expect(result.current.messages.map(({ channelId }) => channelId)).toEqual([20]);

    act(() => opened.resolve({ id: 10, type: "FRIEND", name: "A", contextId: null, readOnly: false, role: "MEMBER" }));
    await waitFor(() => expect(api.getFriendChannelsApi).toHaveBeenCalledTimes(2));
    await act(async () => { canonical.resolve(channels); await opening; });

    expect(result.current.selectedChannelId).toBe(20);
    expect(result.current.messages.map(({ channelId }) => channelId)).toEqual([20]);
    expect(api.getFriendMessagesApi).not.toHaveBeenCalledWith(10, null, 50);
  });

  it("ignores an older-page result after the selected channel changes", async () => {
    const older = deferred<ChatMessagePage>();
    api.getFriendMessagesApi
      .mockResolvedValueOnce(page([message(2), message(3)], true, 2))
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(page([message(20, 20)]));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });

    act(() => { void result.current.loadOlder(); });
    await act(async () => { await result.current.selectChannel(20); });
    await act(async () => { older.resolve(page([message(1)])); await older.promise; });

    expect(result.current.selectedChannelId).toBe(20);
    expect(result.current.messages.map(({ id }) => id)).toEqual([20]);
    expect(result.current.olderLoading).toBe(false);
  });

  it("prepends chronological older pages, deduplicates, and accepts the authoritative send result", async () => {
    api.getFriendMessagesApi
      .mockResolvedValueOnce(page([message(2), message(3)], true, 2))
      .mockResolvedValueOnce(page([message(1), message(2)]));
    api.sendFriendMessageApi.mockResolvedValue(message(4));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    await act(async () => { await result.current.loadOlder(); });
    expect(result.current.messages.map(({ id }) => id)).toEqual([1, 2, 3]);

    act(() => result.current.setDraft(" hello "));
    await act(async () => { expect(await result.current.send()).toBe(true); });
    expect(api.sendFriendMessageApi).toHaveBeenCalledWith(10, "hello", expect.any(String));
    expect(result.current.messages.map(({ id }) => id)).toEqual([1, 2, 3, 4]);
    expect(result.current.draft).toBe("");
  });

  it("keeps the draft after send failure and reconciles the latest page exactly once", async () => {
    api.getFriendMessagesApi
      .mockResolvedValueOnce(page([message(1)]))
      .mockResolvedValueOnce(page([message(1), message(2)]));
    api.sendFriendMessageApi.mockRejectedValue(new Error("send failed"));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("keep me"));

    await act(async () => { expect(await result.current.send()).toBe(false); });
    expect(api.sendFriendMessageApi).toHaveBeenCalledTimes(1);
    expect(api.getFriendMessagesApi).toHaveBeenCalledTimes(2);
    expect(result.current.messages.map(({ id }) => id)).toEqual([1, 2]);
    expect(result.current.draft).toBe("keep me");
    expect(result.current.sendError).toBe("send failed");
  });

  it("reuses a message key after lost response and replaces it after an edit", async () => {
    api.sendFriendMessageApi.mockRejectedValueOnce(new Error("response lost")).mockResolvedValueOnce(message(2)).mockResolvedValueOnce(message(3));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("same"));
    await act(async () => { await result.current.send(); });
    const firstKey = api.sendFriendMessageApi.mock.calls[0][2];
    await act(async () => { await result.current.send(); });
    expect(api.sendFriendMessageApi.mock.calls[1][2]).toBe(firstKey);
    act(() => result.current.setDraft("changed"));
    await act(async () => { await result.current.send(); });
    expect(api.sendFriendMessageApi.mock.calls[2][2]).not.toBe(firstKey);
  });

  it("reloads canonical channels before selecting the ID returned by open", async () => {
    api.openFriendChannelApi.mockResolvedValue({ id: 20, type: "FRIEND", name: "ignored", contextId: null, readOnly: false, role: "MEMBER" });
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));

    await act(async () => { await result.current.openFriendChat(80); });
    expect(api.openFriendChannelApi).toHaveBeenCalledWith(80);
    expect(api.getFriendChannelsApi).toHaveBeenCalledTimes(2);
    expect(result.current.selectedChannelId).toBe(20);
  });

  it("does not select or create a channel after blocked open, and lets the user retry open", async () => {
    api.openFriendChannelApi.mockRejectedValueOnce(blocked()).mockResolvedValueOnce({ id: 10, type: "FRIEND", name: "A", contextId: null, readOnly: false, role: "MEMBER" });
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));

    await act(async () => { await result.current.openFriendChat(70); });
    expect(result.current.selectedChannelId).toBeNull();
    expect(result.current.openError).toMatchObject({ peerPlayerId: 70, blocked: true });
    expect(api.getFriendChannelsApi).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.openFriendChat(70); });
    expect(result.current.selectedChannelId).toBe(10);
    expect(result.current.openError).toBeNull();
    expect(result.current.blocked).toBe(true);
  });

  it.each(["list then block", "block then list"])("reconciles a blocked peer when the initial channel %s", async (order) => {
    const listing = deferred<FriendChatChannel[]>();
    const opening = deferred<never>();
    api.getFriendChannelsApi.mockReturnValue(listing.promise);
    api.openFriendChannelApi.mockReturnValue(opening.promise);
    const { result } = renderHook(() => useDirectChat());

    let pending!: Promise<void>;
    act(() => { pending = result.current.openFriendChat(70); });
    const finishList = async () => {
      await act(async () => { listing.resolve(channels); await listing.promise; });
      expect(result.current.channels).toEqual(channels);
    };
    const finishBlock = async () => {
      await act(async () => { opening.reject(blocked()); await pending; });
      expect(result.current.openError).toMatchObject({ peerPlayerId: 70, blocked: true });
    };
    if (order === "list then block") {
      await finishList();
      await finishBlock();
    } else {
      await finishBlock();
      await finishList();
    }

    await act(async () => { await result.current.selectChannel(10); });
    expect(result.current.channels[0].readOnly).toBe(false);
    expect(result.current.blocked).toBe(true);
    await act(async () => { await result.current.selectChannel(20); });
    expect(result.current.blocked).toBe(false);
  });

  it("ignores a late blocked open for A after B is selected", async () => {
    const opening = deferred<never>();
    api.openFriendChannelApi.mockReturnValue(opening.promise);
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));

    let pending!: Promise<void>;
    act(() => { pending = result.current.openFriendChat(70); });
    await act(async () => { await result.current.selectChannel(20); });
    await act(async () => { opening.reject(blocked()); await pending; });

    expect(result.current.selectedChannelId).toBe(20);
    expect(result.current.blocked).toBe(false);
    expect(result.current.openError).toBeNull();
    await act(async () => { await result.current.selectChannel(10); });
    expect(result.current.blocked).toBe(true);
  });

  it("keeps blocked send draft and history, scopes the block to A, and retries only on request", async () => {
    api.getFriendMessagesApi
      .mockResolvedValueOnce(page([message(10)], true, 10))
      .mockResolvedValueOnce(page([message(9)], false));
    api.sendFriendMessageApi.mockRejectedValueOnce(blocked()).mockResolvedValueOnce(message(2));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("keep me"));

    await act(async () => { expect(await result.current.send()).toBe(false); });
    expect(result.current.blocked).toBe(true);
    expect(result.current.draft).toBe("keep me");
    expect(result.current.messages.map(({ id }) => id)).toEqual([10]);
    expect(result.current.hasMore).toBe(true);
    expect(api.getFriendMessagesApi).toHaveBeenCalledTimes(1);
    await act(async () => { await result.current.loadOlder(); });
    expect(result.current.messages.map(({ id }) => id)).toEqual([9, 10]);
    await act(async () => { expect(await result.current.send()).toBe(false); });
    expect(api.sendFriendMessageApi).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.selectChannel(20); });
    expect(result.current.blocked).toBe(false);
    act(() => result.current.setDraft("B draft"));
    await act(async () => { await result.current.selectChannel(10); });
    expect(result.current.blocked).toBe(true);
    expect(result.current.draft).toBe("keep me");
    act(() => result.current.setDraft("explicit retry"));
    await act(async () => { expect(await result.current.retryBlockedSend()).toBe(true); });
    expect(result.current.blocked).toBe(false);
    expect(result.current.draft).toBe("");
    expect(api.sendFriendMessageApi).toHaveBeenCalledTimes(2);
    await act(async () => { await result.current.selectChannel(20); });
    expect(result.current.draft).toBe("B draft");
  });

  it("clears only A's sent draft after its success arrives while B is selected", async () => {
    const sending = deferred<ChatMessage>();
    api.sendFriendMessageApi.mockReturnValue(sending.promise);
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("A draft"));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.send(); });
    await act(async () => { await result.current.selectChannel(20); });
    act(() => result.current.setDraft("B draft"));

    await act(async () => { sending.resolve(message(2)); expect(await pending).toBe(true); });
    expect(result.current.draft).toBe("B draft");
    await act(async () => { await result.current.selectChannel(10); });
    expect(result.current.draft).toBe("");
  });

  it("keeps a newer A draft even if it has the same text as the sent revision", async () => {
    const sending = deferred<ChatMessage>();
    api.sendFriendMessageApi.mockReturnValue(sending.promise);
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("same text"));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.send(); });
    act(() => { result.current.setDraft("changed"); result.current.setDraft("same text"); });

    await act(async () => { sending.resolve(message(2)); expect(await pending).toBe(true); });
    expect(result.current.draft).toBe("same text");
  });

  it("keeps a late blocked send for A from disabling B", async () => {
    const sending = deferred<ChatMessage>();
    api.sendFriendMessageApi.mockReturnValueOnce(sending.promise).mockResolvedValueOnce(message(21, 20));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("A"));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.send(); });
    await act(async () => { await result.current.selectChannel(20); });
    expect(result.current.sending).toBe(false);
    act(() => result.current.setDraft("B"));
    await act(async () => { expect(await result.current.send()).toBe(true); });
    act(() => result.current.setDraft("B's next draft"));
    await act(async () => { sending.reject(blocked()); await pending; });
    expect(result.current.selectedChannelId).toBe(20);
    expect(result.current.blocked).toBe(false);
    expect(result.current.sendError).toBeNull();
    expect(result.current.draft).toBe("B's next draft");
    expect(result.current.messages.map(({ id }) => id)).toEqual([21]);
  });

  it("drops a late send result when the account changes", async () => {
    const sending = deferred<ChatMessage>();
    api.sendFriendMessageApi.mockReturnValue(sending.promise);
    const { result, rerender } = renderHook(({ accountId }) => useDirectChat(accountId), { initialProps: { accountId: 1 } });
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("old account"));
    let pending!: Promise<boolean>;
    act(() => { pending = result.current.send(); });
    rerender({ accountId: 2 });
    await act(async () => { sending.resolve(message(4)); expect(await pending).toBe(false); });
    expect(result.current.selectedChannelId).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.draft).toBe("");
  });

  it("does not interpret other 403, auth, or general send errors as a block", async () => {
    api.sendFriendMessageApi
      .mockRejectedValueOnce(new ApiError(403, "FORBIDDEN", "Not a member"))
      .mockRejectedValueOnce(new ApiError(401, "AUTH_EXPIRED", "Sign in again"))
      .mockRejectedValueOnce(new Error("Network failed"));
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("keep"));

    for (const expected of ["Not a member", "Sign in again", "Network failed"]) {
      await act(async () => { expect(await result.current.send()).toBe(false); });
      expect(result.current.blocked).toBe(false);
      expect(result.current.sendError).toBe(expected);
      expect(result.current.draft).toBe("keep");
    }
    expect(api.sendFriendMessageApi).toHaveBeenCalledTimes(3);
  });

  it("keeps unrelated open failures and read-only channels separate from blocks", async () => {
    api.openFriendChannelApi.mockRejectedValue(new ApiError(403, "FORBIDDEN", "Not a member"));
    api.getFriendChannelsApi.mockResolvedValue([{ ...channels[0], readOnly: true }]);
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toHaveLength(1));

    await act(async () => { await result.current.openFriendChat(70); });
    expect(result.current.openError).toMatchObject({ blocked: false, message: "Not a member" });
    await act(async () => { await result.current.selectChannel(10); });
    act(() => result.current.setDraft("read only"));
    await act(async () => { expect(await result.current.send()).toBe(false); });
    expect(result.current.blocked).toBe(false);
    expect(api.sendFriendMessageApi).not.toHaveBeenCalled();
  });
});
