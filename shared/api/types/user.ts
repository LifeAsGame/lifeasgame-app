export interface UserSummary {
  id: number;
  email: string;
  nickname: string;
  status: string;
}

export interface UserInfo {
  user: UserSummary;
  player: { exists: boolean; playerId: number | null };
  ui: {
    nextActions: string[];
    badges: { notifications: number; pendingRewards: number };
  };
}

export interface UserSettings {
  notifications: boolean;
  emailAlerts: boolean;
  publicProfile: boolean;
  showOnlineStatus: boolean;
  language: string;
  uiScale: number;
}
