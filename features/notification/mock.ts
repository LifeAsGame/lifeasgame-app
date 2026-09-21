import type { MarkAllRead, NotificationInfo, NotificationPage, NotificationType, UnreadCount } from "@/shared/api/types";

const types: NotificationType[] = [
  "MAIL_RECEIVED",
  "QUEST_PROGRESS",
  "QUEST_COMPLETED",
  "QUEST_REWARD_READY",
  "LISTING_SOLD",
  "ACHIEVEMENT_UNLOCK",
  "SYSTEM_NOTICE",
];

const initial: NotificationInfo[] = Array.from({ length: 25 }, (_, index) => {
  const id = 25 - index;
  return {
    id,
    type: index === 0 ? "QUEST_COMPLETED" : index === 1 ? "QUEST_REWARD_READY" : index === 3 ? "FUTURE_NOTICE" : types[index % types.length],
    title: index === 0 ? "Quest를 완료했어요" : index === 1 ? "Quest 보상이 준비됐어요" : `Notification ${id}`,
    body: index === 0 ? "첫 기록 완료 사실이 기록되었습니다." : index === 1 ? "첫 기록의 확인 가능한 보상이 준비되었습니다. Mailbox 또는 결과 화면에서 상태를 확인해 주세요." : `Canonical inbox item ${id}`,
    titleCopyId: index === 0 ? "notification.ntf_quest_completed.title" : index === 1 ? "notification.ntf_quest_reward_ready.title" : null,
    titleCopyVersion: index < 2 ? 1 : null,
    bodyCopyId: index === 0 ? "notification.ntf_quest_completed.body" : index === 1 ? "notification.ntf_quest_reward_ready.body" : null,
    bodyCopyVersion: index < 2 ? 1 : null,
    copyLocale: index < 2 ? "ko-KR" : null,
    occurredAt: index < 2 ? `2026-09-22T0${1 - index}:00:00Z` : `2026-08-${String(18 - Math.floor(index / 8)).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00Z`,
    read: id % 3 === 0,
  };
});

let notifications = initial.map((notification) => ({ ...notification }));

export const notificationMock = {
  reset() {
    notifications = initial.map((notification) => ({ ...notification }));
  },
  list(cursor: number | null, size: number): NotificationPage {
    const eligible = notifications.filter(({ id }) => cursor === null || id < cursor);
    const page = eligible.slice(0, Math.max(1, Math.min(size, 100)));
    const hasMore = eligible.length > page.length;
    return {
      notifications: page.map((notification) => ({ ...notification })),
      hasMore,
      nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
    };
  },
  unreadCount(): UnreadCount {
    return { unreadCount: notifications.filter(({ read }) => !read).length };
  },
  markRead(id: number) {
    const notification = notifications.find((item) => item.id === id);
    if (!notification) throw new Error("Notification not found.");
    notifications = notifications.map((item) => item.id === id ? { ...item, read: true } : item);
  },
  markAllRead(): MarkAllRead {
    const markedCount = notifications.filter(({ read }) => !read).length;
    notifications = notifications.map((notification) => ({ ...notification, read: true }));
    return { markedCount };
  },
};
