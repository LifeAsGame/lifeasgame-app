export interface FollowSummary {
  id: number;
  playerId: number;
  targetPlayerId: number;
  state: string;
  muted: boolean;
  blocked: boolean;
}

export interface PartySummary {
  id: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
}

export interface PartyInfo {
  id: number;
  playerId: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
  tags: string[];
  descriptionMd: string;
  emblemImageUrl: string | null;
  emblemBgColor: string | null;
  leaderPlayerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuildSummary {
  id: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
}

export interface GuildInfo {
  id: number;
  playerId: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
  tags: string[];
  descriptionMd: string;
  emblemImageUrl: string | null;
  emblemBgColor: string | null;
  leaderPlayerId: number;
  createdAt: string;
  updatedAt: string;
}
