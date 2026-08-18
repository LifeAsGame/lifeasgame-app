import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatMessage, ChatMessagePage, FriendChatChannel } from "@/shared/api/types";
import { useDirectChat } from "./useDirectChat";

const api = vi.hoisted(() => ({
  getFriendChannelsApi: vi.fn(),
  getFriendMessagesApi: vi.fn(),
  openFriendChannelApi: vi.fn(),
  sendFriendMessageApi: vi.fn(),
}));
vi.mock("./api", () => api);

const channels: FriendChatChannel[] = [
  { channelId: 10, peer: { playerId: 70, name: "A", job: null, level: 1 }, readOnly: false },
  { channelId: 20, peer: { playerId: 80, name: "B", job: "Mage", level: 2 }, readOnly: false },
];
const message = (id: number, channelId = 10): ChatMessage => ({ id, channelId, senderId: 6, content: `m${id}`, edited: false, createdAt: "2026-08-18T00:00:00Z" });
const page = (messages: ChatMessage[], hasMore = false, nextCursor: number | null = null): ChatMessagePage => ({ messages, hasMore, nextCursor });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("feature-owned Direct Friend Chat state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(api.sendFriendMessageApi).toHaveBeenCalledWith(10, "hello");
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

  it("reloads canonical channels before selecting the ID returned by open", async () => {
    api.openFriendChannelApi.mockResolvedValue({ id: 20, type: "FRIEND", name: "ignored", contextId: null, readOnly: false, role: "MEMBER" });
    const { result } = renderHook(() => useDirectChat());
    await waitFor(() => expect(result.current.channels).toEqual(channels));

    await act(async () => { await result.current.openFriendChat(80); });
    expect(api.openFriendChannelApi).toHaveBeenCalledWith(80);
    expect(api.getFriendChannelsApi).toHaveBeenCalledTimes(2);
    expect(result.current.selectedChannelId).toBe(20);
  });
});
