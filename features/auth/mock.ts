type MockUser = {
  id: number;
  email: string;
  password: string;
  nickname: string;
  status: string;
  role: "user" | "admin";
  playerId: number | null;
};

export const MOCK_USERS: MockUser[] = [
  {
    id: 1,
    email: "player@lag.io",
    password: "player123",
    nickname: "Kirito",
    status: "ACTIVE",
    role: "user" as const,
    playerId: 6,
  },
  {
    id: 0,
    email: "admin@lag.io",
    password: "admin123",
    nickname: "Admin",
    status: "ACTIVE",
    role: "admin" as const,
    playerId: null,
  },
];
