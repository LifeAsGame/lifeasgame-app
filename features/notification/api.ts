import { USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import type { MarkAllRead, NotificationPage, UnreadCount } from "@/shared/api/types";
import { notificationMock } from "./mock";

export function getNotificationsApi(cursor: number | null = null, size = 20): Promise<NotificationPage> {
  const query = cursor === null ? `size=${size}` : `cursor=${cursor}&size=${size}`;
  return USE_MOCK
    ? Promise.resolve(notificationMock.list(cursor, size))
    : apiGet<NotificationPage>(`/api/v1/notifications?${query}`);
}

export function getUnreadCountApi(): Promise<UnreadCount> {
  return USE_MOCK ? Promise.resolve(notificationMock.unreadCount()) : apiGet<UnreadCount>("/api/v1/notifications/unread-count");
}

export function markNotificationReadApi(id: number): Promise<void> {
  if (USE_MOCK) {
    notificationMock.markRead(id);
    return Promise.resolve();
  }
  return apiPost<void>(`/api/v1/notifications/${id}/read`, undefined);
}

export function markAllNotificationsReadApi(): Promise<MarkAllRead> {
  return USE_MOCK ? Promise.resolve(notificationMock.markAllRead()) : apiPost<MarkAllRead>("/api/v1/notifications/read-all", undefined);
}
