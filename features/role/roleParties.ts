import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/api/client";
import type { ConnectionPage } from "@/shared/api/types";

export type RolePartySummary = { id: number; name: string; description: string | null; status: "ACTIVE" | "DISBANDED"; creatorPlayerId: number; leaderPlayerId: number; memberCount: number; maxMembers: number; roleId?: number; createdAt: string; updatedAt: string };
export type RolePartyDetail = RolePartySummary & { members: RolePartyMember[] };
export type MyRoleParty = { group: RolePartySummary; membershipStatus: "ACTIVE" | "LEFT" };
export type RolePartyMember = { playerId: number; role: "LEADER" | "MEMBER"; joinedAt: string };
export type RolePartyInvitation = { invitationId: number; rolePartyId: number; groupName: string; inviterPlayerId: number; inviteePlayerId: number; expiresAt: string; status: string };
export type RolePartyInput = Pick<RolePartySummary, "name" | "description" | "maxMembers">;

const base = "/api/v1/role-parties";
const page = (index: number) => `?page=${index}&size=20`;
export const rolePartiesForRole = (roleId: number, index = 0) => apiGet<ConnectionPage<RolePartySummary>>(`/api/v1/roles/${roleId}/role-parties${page(index)}`);
export const createRoleParty = (roleId: number, body: RolePartyInput) => apiPost<RolePartyDetail>(`/api/v1/roles/${roleId}/role-parties`, body);
export const myRoleParties = (index = 0) => apiGet<ConnectionPage<MyRoleParty>>(`${base}/mine${page(index)}`);
export const myRolePartyInvitations = (index = 0) => apiGet<ConnectionPage<RolePartyInvitation>>(`${base}/invitations/mine${page(index)}`);
export const rolePartyDetail = (id: number) => apiGet<RolePartyDetail>(`${base}/${id}`);
export const rolePartyMembers = (id: number, index = 0) => apiGet<ConnectionPage<RolePartyMember>>(`${base}/${id}/members${page(index)}`);
export const updateRoleParty = (id: number, body: RolePartyInput) => apiPatch<RolePartyDetail>(`${base}/${id}`, body);
export const inviteToRoleParty = (id: number, inviteePlayerId: number) => apiPost<RolePartyInvitation>(`${base}/${id}/invitations`, { inviteePlayerId });
export const answerRolePartyInvitation = (id: number, invitationId: number, answer: "accept" | "decline") => apiPost<RolePartyDetail | void>(`${base}/${id}/invitations/${invitationId}/${answer}`, {});
export const cancelRolePartyInvitation = (id: number, invitationId: number) => apiDelete<void>(`${base}/${id}/invitations/${invitationId}`);
export const leaveRoleParty = (id: number) => apiPost<void>(`${base}/${id}/leave`, {});
export const transferRolePartyLeader = (id: number, toPlayerId: number) => apiPost<RolePartyDetail>(`${base}/${id}/transfer-leader`, { toPlayerId });
export const disbandRoleParty = (id: number) => apiPost<RolePartyDetail>(`${base}/${id}/disband`, {});
