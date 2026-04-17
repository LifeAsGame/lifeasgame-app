import type { UserInfo, UserSettings } from "../types";

export const MOCK_USER_INFO: UserInfo = {
  user: {
    id: 1,
    email: "player@lag.io",
    nickname: "Kirito",
    status: "ACTIVE",
  },
  player: {
    exists: true,
    playerId: 6,
  },
  ui: {
    nextActions: ["complete_daily_quests", "check_inbox"],
    badges: {
      notifications: 3,
      pendingRewards: 2,
    },
  },
};

export const MOCK_USER_SETTINGS: UserSettings = {
  notifications: true,
  emailAlerts: false,
  publicProfile: true,
  showOnlineStatus: true,
  language: "ko",
  uiScale: 100,
};

export const MOCK_ADMIN_USERS: Array<{
  id: number;
  email: string;
  nickname: string;
  status: string;
  role: string;
  createdAt: string;
}> = [
  { id: 1, email: "player@lag.io", nickname: "Kirito", status: "ACTIVE", role: "USER", createdAt: "2026-01-01T00:00:00Z" },
  { id: 2, email: "asuna@lag.io", nickname: "Asuna", status: "ACTIVE", role: "USER", createdAt: "2026-01-02T00:00:00Z" },
  { id: 3, email: "klein@lag.io", nickname: "Klein", status: "ACTIVE", role: "USER", createdAt: "2026-01-03T00:00:00Z" },
  { id: 4, email: "agil@lag.io", nickname: "Agil", status: "ACTIVE", role: "USER", createdAt: "2026-01-04T00:00:00Z" },
  { id: 5, email: "lisbeth@lag.io", nickname: "Lisbeth", status: "ACTIVE", role: "USER", createdAt: "2026-01-05T00:00:00Z" },
  { id: 6, email: "silica@lag.io", nickname: "Silica", status: "INACTIVE", role: "USER", createdAt: "2026-01-06T00:00:00Z" },
  { id: 0, email: "admin@lag.io", nickname: "Admin", status: "ACTIVE", role: "ADMIN", createdAt: "2025-12-01T00:00:00Z" },
];
