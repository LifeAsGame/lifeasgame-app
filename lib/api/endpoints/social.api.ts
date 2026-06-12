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
  const res = await apiGet<{ contents: PartyInfo[] }>("/api/v1/parties/recent");
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

export async function requestJoinPartyApi(partyId: number, message?: string): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/parties/${partyId}/request-join`, { message });
}

export async function leavePartyApi(partyId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/parties/${partyId}/leave`, {});
}

export async function getGuildsApi(): Promise<GuildInfo[]> {
  if (USE_MOCK) return MOCK_GUILDS;
  const res = await apiGet<{ contents: GuildInfo[] }>("/api/v1/guilds/recent");
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

export async function requestJoinGuildApi(guildId: number, message?: string): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/guilds/${guildId}/request-join`, { message });
}

export async function leaveGuildApi(guildId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/guilds/${guildId}/leave`, {});
}

export async function getFollowsApi(): Promise<FollowSummary[]> {
  if (USE_MOCK) return MOCK_FOLLOWS;
  const res = await apiGet<{ contents: FollowSummary[] }>("/api/v1/follows/followings");
  return res.contents;
}

export async function getFriendProfilesApi(): Promise<
  Array<{
    followId: number;
    targetPlayerId: number;
    nickname: string;
    level: number;
    job: string;
    status: string;
    muted: boolean;
    blocked: boolean;
  }>
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
  const res = await apiGet<{
    content: Array<{
      followId: number;
      targetPlayerId: number;
      nickname: string;
      level: number;
      job: string;
      status: string;
      muted: boolean;
      blocked: boolean;
    }>;
  }>("/api/v1/follows/followings");
  return res.content;
}

export async function unfollowApi(followId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/follows/${followId}/unfollow`, {});
}

export async function muteFollowApi(followId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/follows/${followId}/mute`, {});
}

export async function unmuteFollowApi(followId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/follows/${followId}/unmute`, {});
}

export async function blockFollowApi(followId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPost(`/api/v1/follows/${followId}/block`, {});
}

export async function sendGiftApi(data: {
  receiverPlayerId: number;
  itemInstanceId: number;
  quantity: number;
  memo: string;
}): Promise<{ mailId: number }> {
  if (USE_MOCK) {
    return { mailId: Date.now() };
  }
  return apiPost<{ mailId: number }>("/api/v1/social/gift", data);
}

export async function openFriendChatChannelApi(friendPlayerId: number): Promise<{ channelId: number }> {
  if (USE_MOCK) {
    return { channelId: friendPlayerId * 1000 };
  }
  const res = await apiPost<{ id: number }>(`/api/v1/chat/channels/friend/${friendPlayerId}`, {
    friendPlayerId,
  });
  return { channelId: res.id };
}

export async function getChatMessagesApi(
  channelId: number,
  cursor?: number,
  size = 50,
): Promise<Array<{ id: number; senderId: number; senderName: string; content: string; sentAt: string }>> {
  if (USE_MOCK) return [];
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) params.set("cursor", String(cursor));
  const res = await apiGet<{
    messages: Array<{ id: number; senderId: number; senderName: string; content: string; sentAt: string }>;
  }>(`/api/v1/chat/channels/${channelId}/messages?${params}`);
  return res.messages;
}

export async function sendChatMessageApi(
  channelId: number,
  content: string,
): Promise<{ messageId: number }> {
  if (USE_MOCK) return { messageId: Date.now() };
  const res = await apiPost<{ id: number }>(`/api/v1/chat/channels/${channelId}/messages`, { content });
  return { messageId: res.id };
}
