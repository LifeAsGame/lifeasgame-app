import { beforeEach, describe, expect, it } from "vitest";

import { notificationMock } from "./mock";

describe("Notification mock authority", () => {
  beforeEach(() => notificationMock.reset());

  it("matches descending cursor pages and global read authority", () => {
    const first = notificationMock.list(null, 20);
    expect(first.notifications.map(({ id }) => id)).toEqual(Array.from({ length: 20 }, (_, index) => 25 - index));
    expect(first).toMatchObject({ hasMore: true, nextCursor: 6 });
    expect(first.notifications.every(({ id }) => typeof id === "number")).toBe(true);
    expect(first.notifications.some((item) => "data" in item)).toBe(false);

    const older = notificationMock.list(first.nextCursor, 20);
    expect(older.notifications.map(({ id }) => id)).toEqual([5, 4, 3, 2, 1]);
    expect(older).toMatchObject({ hasMore: false, nextCursor: null });

    const before = notificationMock.unreadCount().unreadCount;
    notificationMock.markRead(25);
    expect(notificationMock.unreadCount().unreadCount).toBe(before - 1);
    expect(notificationMock.markAllRead().markedCount).toBe(before - 1);
    expect(notificationMock.unreadCount()).toEqual({ unreadCount: 0 });
  });
});
