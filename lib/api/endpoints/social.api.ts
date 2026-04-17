import { USE_MOCK, apiGet, apiPost } from "../client";
import {
  MOCK_FOLLOWS,
  MOCK_FRIEND_PROFILES,
  MOCK_GUILDS,
  MOCK_PARTIES,
} from "../mock/social.mock";
import type { FollowSummary, GuildInfo, PartyInfo } from "../types";

export async function getPartiesApi(): Promise<PartyInfo[]> {
  if (USE_MOCK) return MOCK_PARTIES;
  const res = await apiGet<{ contents: PartyInfo[] }>("/api/v1/parties");
  return res.contents;
}

export async function createPartyApi(data: {
  name: string;
  description: string;
  maxMembers: number;
  joinPolicy: string;
  tags: string[];
}): Promise<PartyInfo> {
  if (USE_MOCK) {
    const newParty: PartyInfo = {
      id: Date.now(),
      playerId: 6,
      name: data.name,
      code: `PTY-${Date.now()}`,
      visibility: "PUBLIC",
      joinPolicy: data.joinPolicy,
      status: "FORMING",
      maxMembers: data.maxMembers,
      tags: data.tags,
      descriptionMd: data.description,
      emblemImageUrl: null,
      emblemBgColor: null,
      leaderPlayerId: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newParty;
  }
  return apiPost<PartyInfo>("/api/v1/parties", data);
}

export async function getGuildsApi(): Promise<GuildInfo[]> {
  if (USE_MOCK) return MOCK_GUILDS;
  const res = await apiGet<{ contents: GuildInfo[] }>("/api/v1/guilds");
  return res.contents;
}

export async function createGuildApi(data: {
  name: string;
  description: string;
  maxMembers: number;
  joinPolicy: string;
  tags: string[];
}): Promise<GuildInfo> {
  if (USE_MOCK) {
    const newGuild: GuildInfo = {
      id: Date.now(),
      playerId: 6,
      name: data.name,
      code: `GLD-${Date.now()}`,
      visibility: "PUBLIC",
      joinPolicy: data.joinPolicy,
      status: "ACTIVE",
      maxMembers: data.maxMembers,
      tags: data.tags,
      descriptionMd: data.description,
      emblemImageUrl: null,
      emblemBgColor: null,
      leaderPlayerId: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return newGuild;
  }
  return apiPost<GuildInfo>("/api/v1/guilds", data);
}

export async function getFollowsApi(): Promise<FollowSummary[]> {
  if (USE_MOCK) return MOCK_FOLLOWS;
  const res = await apiGet<{ contents: FollowSummary[] }>("/api/v1/follows");
  return res.contents;
}

export async function getFriendProfilesApi(): Promise<
  Array<{ followId: number; targetPlayerId: number; nickname: string; level: number; job: string; status: string; muted: boolean; blocked: boolean }>
> {
  if (USE_MOCK) {
    return MOCK_FOLLOWS.map((f) => {
      const profile = MOCK_FRIEND_PROFILES[f.targetPlayerId] ?? {
        nickname: `Player ${f.targetPlayerId}`,
        level: 50,
        job: "Adventurer",
        status: "OFFLINE",
      };
      return {
        followId: f.id,
        targetPlayerId: f.targetPlayerId,
        nickname: profile.nickname,
        level: profile.level,
        job: profile.job,
        status: profile.status,
        muted: f.muted,
        blocked: f.blocked,
      };
    });
  }
  return apiGet("/api/v1/follows/friends");
}

export async function unfollowApi(followId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/follows/${followId}/unfollow`, {});
}
