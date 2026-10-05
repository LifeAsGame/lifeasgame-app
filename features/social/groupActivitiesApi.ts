import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/shared/api/client";
import type { ConnectionPage } from "@/shared/api/types";

export type ActivityGroup = "PARTY" | "ROLE_PARTY";
export type ActivityFields = { title: string; sharedDescription: string | null; location: string | null; startsAt: string; endsAt: string };
export type GroupActivity = ActivityFields & {
  id: number; groupType: ActivityGroup; groupId: number; status: "PLANNED" | "COMPLETED" | "CANCELED";
  createdByPlayerId: number; createdAt: string; updatedAt: string; version: number;
  participantCount: number; myRsvp: boolean;
  capabilities: { canEdit: boolean; canManageEditors: boolean; canRsvp: boolean };
};
export type ActivityParticipant = { playerId: number; joinedAt: string };
export type ActivityEditor = { playerId: number };
const base = (type: ActivityGroup, groupId: number) => `/api/v1/${type === "PARTY" ? "parties" : "role-parties"}/${groupId}/activities`;
const page = (index: number) => `?page=${index}&size=20`;

export const activities = (type: ActivityGroup, groupId: number, index = 0) => apiGet<ConnectionPage<GroupActivity>>(`${base(type, groupId)}${page(index)}`);
export const activity = (type: ActivityGroup, groupId: number, id: number) => apiGet<GroupActivity>(`${base(type, groupId)}/${id}`);
export const createActivity = (type: ActivityGroup, groupId: number, fields: ActivityFields, clientRequestId: string) => apiPost<GroupActivity>(base(type, groupId), { ...fields, clientRequestId });
export const updateActivity = (type: ActivityGroup, groupId: number, id: number, fields: ActivityFields, version: number) => apiPatch<GroupActivity>(`${base(type, groupId)}/${id}`, { ...fields, version });
export const finishActivity = (type: ActivityGroup, groupId: number, id: number, action: "complete" | "cancel", version: number) => apiPost<GroupActivity>(`${base(type, groupId)}/${id}/${action}`, { version });
export const activityRsvp = (type: ActivityGroup, groupId: number, id: number) => apiPut<GroupActivity>(`${base(type, groupId)}/${id}/rsvp`, {});
export const cancelActivityRsvp = (type: ActivityGroup, groupId: number, id: number) => apiDelete<void>(`${base(type, groupId)}/${id}/rsvp`);
export const activityParticipants = (type: ActivityGroup, groupId: number, id: number, index = 0) => apiGet<ConnectionPage<ActivityParticipant>>(`${base(type, groupId)}/${id}/participants${page(index)}`);
export const activityEditors = (type: ActivityGroup, groupId: number, index = 0) => apiGet<ConnectionPage<ActivityEditor>>(`${base(type, groupId)}/editors${page(index)}`);
export const grantActivityEditor = (type: ActivityGroup, groupId: number, playerId: number) => apiPut<void>(`${base(type, groupId)}/editors/${playerId}`, {});
export const revokeActivityEditor = (type: ActivityGroup, groupId: number, playerId: number) => apiDelete<void>(`${base(type, groupId)}/editors/${playerId}`);
