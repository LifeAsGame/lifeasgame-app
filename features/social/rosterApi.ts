import { apiDelete, apiGet, apiPatch, apiPost } from "@/shared/api/client";
import type { GroupPage } from "./groups";

export type RosterGroupType = "GUILD" | "PARTY";
export type RosterRow = {
  rosterEntryId: number; groupType: RosterGroupType; groupId: number;
  displayName: string; groupRoleLabel: string | null; version: number;
  status: "UNLINKED" | "LINKED"; linkedPlayerId: number | null;
  memberStatus: "ACTIVE" | "LEFT" | null;
};
export type RosterPage = GroupPage<RosterRow> & { capabilities: { canManageRoster: boolean; canInvite: boolean } };
export type RosterInvitation = {
  invitationId: number; groupType: RosterGroupType; groupId: number; groupName: string;
  rosterEntryId: number; rosterDisplayName: string; targetPlayerId?: number;
  expiresAt: string; membershipWillBeCreated: boolean; status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED";
};
const base = (type: RosterGroupType, id: number) => `/api/v1/${type === "GUILD" ? "guilds" : "parties"}/${id}/roster`;
const page = (index: number) => `page=${index}&size=20`;

export const rosterRows = (type: RosterGroupType, id: number, index = 0, status: "ALL" | "UNLINKED" | "LINKED" = "ALL", keyword = "") => apiGet<RosterPage>(`${base(type, id)}?${page(index)}&status=${status}&keyword=${encodeURIComponent(keyword)}`);
export const createRosterRow = (type: RosterGroupType, id: number, body: { displayName: string; groupRoleLabel: string | null }) => apiPost<RosterRow>(base(type, id), body);
export const updateRosterRow = (type: RosterGroupType, id: number, rowId: number, body: { displayName: string; groupRoleLabel: string | null; version: number }) => apiPatch<RosterRow>(`${base(type, id)}/${rowId}`, body);
export const deleteRosterRow = (type: RosterGroupType, id: number, rowId: number, version: number) => apiDelete<void>(`${base(type, id)}/${rowId}`, { version });
export const inviteRosterRow = (type: RosterGroupType, id: number, rowId: number, targetPlayerId: number) => apiPost<RosterInvitation>(`${base(type, id)}/${rowId}/invitations`, { targetPlayerId });
export const pendingRosterInvitations = (type: RosterGroupType, id: number, index = 0) => apiGet<GroupPage<RosterInvitation>>(`${base(type, id)}/invitations/pending?${page(index)}`);
export const cancelRosterInvitation = (type: RosterGroupType, id: number, invitationId: number) => apiPost<RosterInvitation>(`${base(type, id)}/invitations/${invitationId}/cancel`, {});
export const myRosterInvitations = (index = 0) => apiGet<GroupPage<RosterInvitation>>(`/api/v1/roster-invitations/mine?${page(index)}`);
export const answerRosterInvitation = (invitationId: number, answer: "accept" | "decline") => apiPost<RosterRow | RosterInvitation>(`/api/v1/roster-invitations/${invitationId}/${answer}`, {});
