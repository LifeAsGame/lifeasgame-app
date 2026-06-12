export type NotificationEventType =
  | "FRIEND_ONLINE"
  | "FRIEND_OFFLINE"
  | "MAIL_RECEIVED"
  | "QUEST_PROGRESS"
  | "QUEST_COMPLETED"
  | "QUEST_REWARD_READY"
  | "PARTY_INVITE"
  | "GUILD_INVITE"
  | "LISTING_SOLD"
  | "SKILL_LEVELUP"
  | "ACHIEVEMENT_UNLOCK"
  | "SYSTEM_NOTICE";

export interface NotificationEvent {
  id: string;
  type: NotificationEventType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  occurredAt: string;
  read: boolean;
}
