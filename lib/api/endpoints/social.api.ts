import { USE_MOCK, apiGet, apiPost } from "../client";
import { MOCK_GUILDS, MOCK_PARTIES } from "../mock/social.mock";
import type { GuildInfo, PartyInfo } from "../types";

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
