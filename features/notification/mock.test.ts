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
    expect(first.notifications[0]).toMatchObject({
      type: "QUEST_COMPLETED", title: "Quest를 완료했어요", body: "첫 기록 완료 사실이 기록되었습니다.",
      titleCopyId: "notification.ntf_quest_completed.title", titleCopyVersion: 1,
      bodyCopyId: "notification.ntf_quest_completed.body", bodyCopyVersion: 1, copyLocale: "ko-KR",
    });
    expect(first.notifications[1]).toMatchObject({
      type: "QUEST_REWARD_READY", title: "Quest 보상이 준비됐어요",
      titleCopyId: "notification.ntf_quest_reward_ready.title", titleCopyVersion: 1,
      bodyCopyId: "notification.ntf_quest_reward_ready.body", bodyCopyVersion: 1, copyLocale: "ko-KR",
    });
    expect(first.notifications[3]).toMatchObject({ type: "FUTURE_NOTICE", titleCopyId: null, titleCopyVersion: null, bodyCopyId: null, bodyCopyVersion: null, copyLocale: null });

    const older = notificationMock.list(first.nextCursor, 20);
    expect(older.notifications.map(({ id }) => id)).toEqual([5, 4, 3, 2, 1]);
    expect(older).toMatchObject({ hasMore: false, nextCursor: null });
    expect(older.notifications[0]).toMatchObject({ titleCopyId: null, titleCopyVersion: null, bodyCopyId: null, bodyCopyVersion: null, copyLocale: null });

    const before = notificationMock.unreadCount().unreadCount;
    notificationMock.markRead(25);
    expect(notificationMock.list(null, 1).notifications[0]).toEqual({ ...first.notifications[0], read: true });
    expect(notificationMock.unreadCount().unreadCount).toBe(before - 1);
    expect(notificationMock.markAllRead().markedCount).toBe(before - 1);
    expect(notificationMock.unreadCount()).toEqual({ unreadCount: 0 });
    expect(notificationMock.list(null, 2).notifications[1]).toEqual({ ...first.notifications[1], read: true });
  });
});
