import { apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";
import type { ConnectionPage, PersonInput } from "@/shared/api/types";
import type { RoleGroupType } from "@/features/role/contextApi";

export type MemberContext = { groupType: RoleGroupType; groupId: number; memberPlayerId: number };
export type MemberPersonLink = MemberContext & { personId: number | null; personStatus: string | null };
export type GuildNote = { id: number; personId: number; guildId: number; targetMemberPlayerId: number; text: string; version: number; availability: "CURRENT" | "HISTORY"; guildName: string | null };
const identityPath = "/api/v1/member-person-links";
export const getMemberPerson = (context: MemberContext) => apiGet<MemberPersonLink>(`${identityPath}?${new URLSearchParams({ groupType: context.groupType, groupId: String(context.groupId), memberPlayerId: String(context.memberPlayerId) })}`);
export const selectMemberPerson = (context: MemberContext, personId: number) => apiPut<MemberPersonLink>(identityPath, { ...context, personId });
export const createMemberPerson = (context: MemberContext, body: PersonInput) => apiPost<MemberPersonLink>(identityPath, { ...context, ...body });
const notePath = (guildId: number, playerId: number) => `/api/v1/guilds/${guildId}/members/${playerId}/my-note`;
export const getGuildNote = (guildId: number, playerId: number) => apiGet<GuildNote>(notePath(guildId, playerId));
export const saveGuildNote = (guildId: number, playerId: number, body: { personId: number; text: string; version?: number }) => apiPut<GuildNote>(notePath(guildId, playerId), body);
export const deleteGuildNote = (id: number) => apiDelete<void>(`/api/v1/guild-notes/${id}`);
export const personGuildNotes = (personId: number, page = 0) => apiGet<ConnectionPage<GuildNote>>(`/api/v1/persons/${personId}/guild-notes?page=${page}&size=20&includeHistory=true`);
