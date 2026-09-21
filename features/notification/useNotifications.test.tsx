import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationInfo, NotificationPage } from "@/shared/api/types";
import { useNotifications } from "./useNotifications";

const api = vi.hoisted(() => ({
  getNotificationsApi: vi.fn(),
  getUnreadCountApi: vi.fn(),
  markAllNotificationsReadApi: vi.fn(),
  markNotificationReadApi: vi.fn(),
}));
vi.mock("./api", () => api);

const item = (id: number, read = false): NotificationInfo => ({
  id,
  type: "SYSTEM_NOTICE",
  title: `Notice ${id}`,
  body: `Body ${id}`,
  titleCopyId: null,
  titleCopyVersion: null,
  bodyCopyId: null,
  bodyCopyVersion: null,
  copyLocale: null,
  occurredAt: "2026-08-18T00:00:00Z",
  read,
});
const page = (notifications: NotificationInfo[], hasMore = false, nextCursor: number | null = null): NotificationPage => ({ notifications, hasMore, nextCursor });

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

describe("feature-owned Notification state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getUnreadCountApi.mockResolvedValue({ unreadCount: 47 });
    api.getNotificationsApi.mockResolvedValue(page([]));
    api.markNotificationReadApi.mockResolvedValue(undefined);
    api.markAllNotificationsReadApi.mockResolvedValue({ markedCount: 1 });
  });

  it("loads backend unread authority on mount and defers the inbox until requested", async () => {
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(47));
    expect(api.getNotificationsApi).not.toHaveBeenCalled();

    api.getNotificationsApi.mockResolvedValueOnce(page([item(3), item(2, true)]));
    await act(async () => { await result.current.loadInbox(); });
    expect(result.current.inbox).toHaveLength(2);
    expect(result.current.unreadCount).toBe(47);
  });

  it("appends older backend order and deduplicates by numeric ID", async () => {
    api.getNotificationsApi
      .mockResolvedValueOnce(page([item(3), item(2)], true, 2))
      .mockResolvedValueOnce(page([item(2), item(1)]));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(47));
    await act(async () => { await result.current.loadInbox(); });
    await act(async () => { await result.current.loadOlder(); });
    expect(result.current.inbox.map(({ id }) => id)).toEqual([3, 2, 1]);
    expect(result.current.nextCursor).toBeNull();
  });

  it("keeps stored copy and provenance through cursor history, read-one, and read-all", async () => {
    const completion: NotificationInfo = {
      ...item(4), type: "QUEST_COMPLETED", title: "Stored completion", body: "Original quest title",
      titleCopyId: "notification.ntf_quest_completed.title", titleCopyVersion: 1,
      bodyCopyId: "notification.ntf_quest_completed.body", bodyCopyVersion: 1, copyLocale: "ko-KR",
    };
    const reward: NotificationInfo = {
      ...item(3), type: "QUEST_REWARD_READY", title: "Stored reward", body: "Original reward text",
      titleCopyId: "notification.ntf_quest_reward_ready.title", titleCopyVersion: 1,
      bodyCopyId: "notification.ntf_quest_reward_ready.body", bodyCopyVersion: 1, copyLocale: "ko-KR",
    };
    const legacy = { ...item(2), title: "Old title", body: "Old body" };
    const unknown = { ...item(1), type: "FUTURE_NOTICE", title: "Unknown title", body: "Unknown body" };
    api.getNotificationsApi
      .mockResolvedValueOnce(page([completion, reward], true, 3))
      .mockResolvedValueOnce(page([{ ...reward, title: "Stale duplicate", titleCopyId: null }, legacy, unknown]));
    const { result } = renderHook(() => useNotifications());
    await act(async () => { await result.current.loadInbox(); });
    await act(async () => { await result.current.loadOlder(); });
    expect(api.getNotificationsApi.mock.calls).toEqual([[null, 20], [3, 20]]);
    expect(result.current.inbox).toEqual([completion, reward, legacy, unknown]);

    await act(async () => { expect(await result.current.markRead(4)).toBe(true); });
    expect(result.current.inbox).toEqual([{ ...completion, read: true }, reward, legacy, unknown]);
    await act(async () => { expect(await result.current.markAllRead()).toBe(true); });
    expect(result.current.inbox).toEqual([completion, reward, legacy, unknown].map((row) => ({ ...row, read: true })));
  });

  it("keeps loaded inbox rows when an older cursor request fails", async () => {
    api.getNotificationsApi
      .mockResolvedValueOnce(page([item(3), item(2)], true, 2))
      .mockRejectedValueOnce(new Error("older failed"));
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(47));
    await act(async () => { await result.current.loadInbox(); });
    await act(async () => { await result.current.loadOlder(); });

    expect(result.current.inbox.map(({ id }) => id)).toEqual([3, 2]);
    expect(result.current.inboxError).toBe("older failed");
  });

  it("mutates a loaded row only after read success, blocks duplicates, then reloads unread count", async () => {
    const command = deferred<void>();
    api.getNotificationsApi.mockResolvedValueOnce(page([item(3)]));
    api.markNotificationReadApi.mockReturnValue(command.promise);
    api.getUnreadCountApi.mockResolvedValueOnce({ unreadCount: 5 }).mockResolvedValueOnce({ unreadCount: 4 });
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(5));
    await act(async () => { await result.current.loadInbox(); });

    act(() => { void result.current.markRead(3); void result.current.markRead(3); });
    expect(api.markNotificationReadApi).toHaveBeenCalledTimes(1);
    expect(result.current.inbox[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(5);
    await act(async () => { command.resolve(); await command.promise; });
    await waitFor(() => expect(result.current.unreadCount).toBe(4));
    expect(result.current.inbox[0].read).toBe(true);
  });

  it("preserves rows and count when mark-one or mark-all fails", async () => {
    api.getNotificationsApi.mockResolvedValueOnce(page([item(3)]));
    api.markNotificationReadApi.mockRejectedValueOnce(new Error("one failed"));
    api.markAllNotificationsReadApi.mockRejectedValueOnce(new Error("all failed"));
    api.getUnreadCountApi.mockResolvedValue({ unreadCount: 5 });
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(5));
    await act(async () => { await result.current.loadInbox(); });

    await act(async () => { expect(await result.current.markRead(3)).toBe(false); });
    expect(result.current.inbox[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(5);
    expect(result.current.mutationError).toBe("one failed");

    await act(async () => { expect(await result.current.markAllRead()).toBe(false); });
    expect(result.current.inbox[0].read).toBe(false);
    expect(result.current.unreadCount).toBe(5);
    expect(result.current.mutationError).toBe("all failed");
    expect(api.getUnreadCountApi).toHaveBeenCalledTimes(1);
  });

  it("marks all loaded rows only after success and refreshes the authoritative count", async () => {
    api.getNotificationsApi.mockResolvedValueOnce(page([item(3), item(2)]));
    api.getUnreadCountApi.mockResolvedValueOnce({ unreadCount: 9 }).mockResolvedValueOnce({ unreadCount: 0 });
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.unreadCount).toBe(9));
    await act(async () => { await result.current.loadInbox(); });
    await act(async () => { expect(await result.current.markAllRead()).toBe(true); });
    expect(result.current.inbox.every(({ read }) => read)).toBe(true);
    expect(result.current.unreadCount).toBe(0);
  });
});
