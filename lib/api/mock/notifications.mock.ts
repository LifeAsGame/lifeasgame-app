import type { NotificationEvent } from "@/shared/api/types";

export const MOCK_NOTIFICATIONS: NotificationEvent[] = [
  {
    id: "notif-001",
    type: "FRIEND_ONLINE",
    title: "Asuna 온라인",
    body: "친구 Asuna가 접속했습니다.",
    data: { playerId: 101, nickname: "Asuna" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    read: false,
  },
  {
    id: "notif-002",
    type: "MAIL_RECEIVED",
    title: "새 우편물 도착",
    body: "Klein에게서 HP 포션 (L) x5 를 받았습니다.",
    data: { mailId: 9, from: "Klein", itemName: "HP 포션 (L)", quantity: 5 },
    occurredAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
  },
  {
    id: "notif-003",
    type: "QUEST_REWARD_READY",
    title: "퀘스트 보상 대기 중",
    body: "\"Floor 50 개척자\" 퀘스트 보상을 수령하세요!",
    data: { questCode: "STORY_FLOOR_50", rewardExp: 5000 },
    occurredAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    read: false,
  },
  {
    id: "notif-004",
    type: "LISTING_SOLD",
    title: "리스팅 판매 완료",
    body: "Pale Edge가 35,000 col에 판매되었습니다.",
    data: { listingId: 101, itemName: "Pale Edge", price: 35000 },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    read: true,
  },
  {
    id: "notif-005",
    type: "ACHIEVEMENT_UNLOCK",
    title: "업적 해금",
    body: "업적 \"Floor Boss Hunter\" 를 달성했습니다!",
    data: { achievementCode: "FLOOR_BOSS_HUNTER" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    read: true,
  },
  {
    id: "notif-006",
    type: "PARTY_INVITE",
    title: "파티 초대",
    body: "Agil이 \"Clearers Guild Raid\" 파티에 초대했습니다.",
    data: { partyId: 42, partyName: "Clearers Guild Raid", inviterName: "Agil" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    read: false,
  },
];

// SSE 시뮬레이션용 — 일정 간격으로 발생할 이벤트 시나리오
export const SSE_EVENT_SCENARIOS: NotificationEvent[] = [
  {
    id: "sse-live-001",
    type: "FRIEND_ONLINE",
    title: "Lisbeth 온라인",
    body: "친구 Lisbeth가 접속했습니다.",
    data: { playerId: 105, nickname: "Lisbeth" },
    occurredAt: "",
    read: false,
  },
  {
    id: "sse-live-002",
    type: "QUEST_PROGRESS",
    title: "퀘스트 진행",
    body: "\"일일 수련\" 진행도 3/5 달성",
    data: { questCode: "DAILY_TRAINING", progress: 3, target: 5 },
    occurredAt: "",
    read: false,
  },
  {
    id: "sse-live-003",
    type: "MAIL_RECEIVED",
    title: "새 우편물 도착",
    body: "시스템에서 이벤트 보상 아이템을 수령했습니다.",
    data: { mailId: 10, from: "System", itemName: "이벤트 보상 상자", quantity: 1 },
    occurredAt: "",
    read: false,
  },
];
