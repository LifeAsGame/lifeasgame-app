import { beforeEach, describe, expect, it, vi } from "vitest";

import type { NotificationPage } from "@/shared/api/types";
import { getNotificationsApi, getUnreadCountApi, markAllNotificationsReadApi, markNotificationReadApi } from "./api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Notification API contract", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("passes through persisted copy and nullable history on inbox/cursor without an identity body", async () => {
    const backendPage = {
      notifications: [{
        id: 91, type: "QUEST_COMPLETED", title: "Stored completion", body: "Stored title at event time",
        titleCopyId: "notification.ntf_quest_completed.title", titleCopyVersion: 1,
        bodyCopyId: "notification.ntf_quest_completed.body", bodyCopyVersion: 1, copyLocale: "ko-KR",
        occurredAt: "2026-09-22T10:00:00Z", read: false,
      }],
      hasMore: true,
      nextCursor: 91,
    } satisfies NotificationPage;
    const olderPage = {
      notifications: [{
        id: 81, type: "FUTURE_NOTICE", title: "Historical title", body: "Historical body",
        titleCopyId: null, titleCopyVersion: null, bodyCopyId: null, bodyCopyVersion: null, copyLocale: null,
        occurredAt: "2026-08-21T10:00:00Z", read: true,
      }],
      hasMore: false, nextCursor: null,
    } satisfies NotificationPage;
    client.apiGet
      .mockResolvedValueOnce(backendPage)
      .mockResolvedValueOnce(olderPage)
      .mockResolvedValueOnce({ unreadCount: 3 });
    client.apiPost.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ markedCount: 4 });

    const inbox = await getNotificationsApi();
    const older = await getNotificationsApi(81, 20);
    const unread = await getUnreadCountApi();
    const markedOne = await markNotificationReadApi(91);
    const markedAll = await markAllNotificationsReadApi();

    expect(client.apiGet.mock.calls).toEqual([
      ["/api/v1/notifications?size=20"],
      ["/api/v1/notifications?cursor=81&size=20"],
      ["/api/v1/notifications/unread-count"],
    ]);
    expect(client.apiPost.mock.calls).toEqual([
      ["/api/v1/notifications/91/read", undefined],
      ["/api/v1/notifications/read-all", undefined],
    ]);
    expect(inbox).toEqual(backendPage);
    expect(inbox.notifications[0]).toMatchObject({ title: "Stored completion", body: "Stored title at event time", titleCopyVersion: 1, copyLocale: "ko-KR" });
    expect(inbox.notifications[0]).not.toHaveProperty("playerId");
    expect(inbox.notifications[0]).not.toHaveProperty("userId");
    expect(older).toEqual(olderPage);
    expect(older.notifications[0]).toMatchObject({ type: "FUTURE_NOTICE", title: "Historical title", titleCopyId: null, copyLocale: null });
    expect(unread).toEqual({ unreadCount: 3 });
    expect(markedOne).toBeUndefined();
    expect(markedAll).toEqual({ markedCount: 4 });
    expect([...client.apiGet.mock.calls, ...client.apiPost.mock.calls].flat().join(" ")).not.toMatch(/token|playerId|userId/);
  });

  it("propagates API failure without returning Mock history", async () => {
    client.apiGet.mockRejectedValueOnce(new Error("Inbox unavailable"));
    await expect(getNotificationsApi()).rejects.toThrow("Inbox unavailable");
  });
});
