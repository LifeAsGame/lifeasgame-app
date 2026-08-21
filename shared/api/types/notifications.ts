export type NotificationType =
  | "MAIL_RECEIVED"
  | "QUEST_PROGRESS"
  | "QUEST_COMPLETED"
  | "QUEST_REWARD_READY"
  | "LISTING_SOLD"
  | "ACHIEVEMENT_UNLOCK"
  | "SYSTEM_NOTICE";

export interface NotificationInfo {
  id: number;
  type: string;
  title: string;
  body: string;
  occurredAt: string;
  read: boolean;
}

export interface NotificationPage {
  notifications: NotificationInfo[];
  hasMore: boolean;
  nextCursor: number | null;
}

export interface UnreadCount {
  unreadCount: number;
}

export interface MarkAllRead {
  markedCount: number;
}
