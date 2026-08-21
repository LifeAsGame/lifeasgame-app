import { beforeEach, describe, expect, it, vi } from "vitest";

import { getNotificationsApi, getUnreadCountApi, markAllNotificationsReadApi, markNotificationReadApi } from "./api";

const client = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }));
vi.mock("@/shared/api/client", () => ({ USE_MOCK: false, ...client }));

describe("Notification API contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes through Backend #293 DTOs on USE_MOCK=false and sends no identity body", async () => {
    const backendPage = {
      notifications: [{ id: 91, type: "FUTURE_NOTICE", title: "Future", body: "Preserve me", occurredAt: "2026-08-21T10:00:00Z", read: false }],
      hasMore: true,
      nextCursor: 91,
    };
    client.apiGet
      .mockResolvedValueOnce(backendPage)
      .mockResolvedValueOnce({ notifications: [], hasMore: false, nextCursor: null })
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
    expect(Object.keys(inbox.notifications[0])).toEqual(["id", "type", "title", "body", "occurredAt", "read"]);
    expect(inbox.notifications[0]).not.toHaveProperty("playerId");
    expect(inbox.notifications[0]).not.toHaveProperty("userId");
    expect(older).toEqual({ notifications: [], hasMore: false, nextCursor: null });
    expect(unread).toEqual({ unreadCount: 3 });
    expect(markedOne).toBeUndefined();
    expect(markedAll).toEqual({ markedCount: 4 });
    expect([...client.apiGet.mock.calls, ...client.apiPost.mock.calls].flat().join(" ")).not.toMatch(/token|playerId|userId/);
  });
});
