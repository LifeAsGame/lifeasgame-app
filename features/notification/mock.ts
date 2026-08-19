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
    type: types[index % types.length],
    title: `Notification ${id}`,
    body: `Canonical inbox item ${id}`,
    occurredAt: `2026-08-${String(18 - Math.floor(index / 8)).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00Z`,
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
