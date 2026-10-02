import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/shared/api/client";
import type { GroupPage } from "./groups";

export type GuildLink = {
  id: number; groupType: "PARTY" | "ROLE_PARTY"; groupId: number; displayName: string;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "CANCELED" | "UNLINKED";
  entryAction?: "OPEN_DETAIL" | "OPEN_PUBLIC_PREVIEW" | "INVITE_REQUIRED";
  proposedByPlayerId?: number; guildLeaderApproved?: boolean; groupLeaderApproved?: boolean;
};
export type GuildEvent = {
  id: number; guildId: number; title: string; sharedDescription: string | null;
  startsAt: string; endsAt: string; location: string | null;
  status: "PLANNED" | "COMPLETED" | "CANCELED"; createdByPlayerId: number;
  participantCount: number; myRsvp: boolean; createdAt: string; updatedAt: string;
};
export type GuildEventInput = Pick<GuildEvent, "title" | "sharedDescription" | "startsAt" | "endsAt" | "location">;
export type GuildEventParticipant = { playerId: number; joinedAt: string };

const root = (guildId: number) => `/api/v1/guilds/${guildId}`;
const page = (index: number) => `?page=${index}&size=20`;
export const guildLinks = (guildId: number, index = 0) => apiGet<GroupPage<GuildLink>>(`${root(guildId)}/group-links${page(index)}`);
export const guildPendingLinks = (guildId: number, index = 0) => apiGet<GroupPage<GuildLink>>(`${root(guildId)}/group-links/pending${page(index)}`);
export const proposeGuildLink = (guildId: number, groupType: GuildLink["groupType"], groupId: number, displayName: string) => apiPost<GuildLink>(`${root(guildId)}/group-links`, { groupType, groupId, displayName });
export const decideGuildLink = (guildId: number, linkId: number, action: "approve" | "reject" | "cancel", displayName?: string) => apiPost<GuildLink>(`${root(guildId)}/group-links/${linkId}/${action}`, action === "approve" ? { displayName } : {});
export const unlinkGuildGroup = (guildId: number, linkId: number) => apiDelete<void>(`${root(guildId)}/group-links/${linkId}`);
export const guildEvents = (guildId: number, index = 0) => apiGet<GroupPage<GuildEvent>>(`${root(guildId)}/events${page(index)}`);
export const guildEvent = (guildId: number, eventId: number) => apiGet<GuildEvent>(`${root(guildId)}/events/${eventId}`);
export const createGuildEvent = (guildId: number, body: GuildEventInput) => apiPost<GuildEvent>(`${root(guildId)}/events`, body);
export const updateGuildEvent = (guildId: number, eventId: number, body: GuildEventInput) => apiPatch<GuildEvent>(`${root(guildId)}/events/${eventId}`, body);
export const finishGuildEvent = (guildId: number, eventId: number, action: "complete" | "cancel") => apiPost<GuildEvent>(`${root(guildId)}/events/${eventId}/${action}`, {});
export const guildEventRsvp = (guildId: number, eventId: number) => apiPut<GuildEvent>(`${root(guildId)}/events/${eventId}/rsvp`, {});
export const cancelGuildEventRsvp = (guildId: number, eventId: number) => apiDelete<void>(`${root(guildId)}/events/${eventId}/rsvp`);
export const guildEventParticipants = (guildId: number, eventId: number, index = 0) => apiGet<GroupPage<GuildEventParticipant>>(`${root(guildId)}/events/${eventId}/participants${page(index)}`);
