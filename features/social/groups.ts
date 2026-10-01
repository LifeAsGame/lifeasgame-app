import { apiGet, apiPost } from "@/shared/api/client";

export type GroupKind = "guilds" | "parties";
export type GroupSummary = { id: number; name: string; code: string; visibility: "PUBLIC" | "PRIVATE"; joinPolicy: "OPEN" | "APPROVAL" | "INVITE_ONLY"; status: string; maxMembers: number };
export type GroupInfo = GroupSummary & { descriptionMd: string | null; tags: string[]; leaderPlayerId: number; createdAt: string };
export type MyGroup = Pick<GroupSummary, "id" | "name" | "code" | "status" | "maxMembers"> & { myRole: string; memberCount: number };
export type GroupMember = { playerId: number; role: string; joinedAt: string };
export type GroupPending = { id: number; playerId: number; name?: string; code?: string; guildId?: number; partyId?: number; type: string; status: string; message: string | null; requestedAt: string; expiresAt: string | null };
export type GroupMe = { myRole: string | null; pendingJoin: boolean; pendingInvitation: boolean; actions: string[] };
export type GroupPage<T> = { contents: T[]; page: number; size: number; totalElements: number; totalPages: number };
export type GroupCreate = Pick<GroupSummary, "name" | "code" | "visibility" | "joinPolicy" | "maxMembers"> & { descriptionMd: string | null };

const base = (kind: GroupKind) => `/api/v1/${kind}`;
export const groupSearch = (kind: GroupKind, keyword: string, page: number) => apiGet<GroupPage<GroupSummary>>(`${base(kind)}/search?page=${page}&size=20${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`);
export const groupMine = (kind: GroupKind, page: number) => apiGet<GroupPage<MyGroup>>(`${base(kind)}/mine?page=${page}&size=20`);
export const groupPending = (kind: GroupKind, type: "requests" | "invitations", page: number) => apiGet<GroupPage<GroupPending>>(`${base(kind)}/${type}?page=${page}&size=20`);
export const groupInfo = (kind: GroupKind, id: number) => apiGet<GroupInfo>(`${base(kind)}/${id}`);
export const groupPreview = (kind: GroupKind, id: number) => apiGet<GroupSummary>(`${base(kind)}/${id}/preview`);
export const groupMe = (kind: GroupKind, id: number) => apiGet<GroupMe>(`${base(kind)}/${id}/me`);
export const groupMembers = (kind: GroupKind, id: number, page: number) => apiGet<GroupPage<GroupMember>>(`${base(kind)}/${id}/members?page=${page}&size=20`);
export const groupWaiters = (kind: GroupKind, id: number, page: number) => apiGet<GroupPage<GroupPending>>(`${base(kind)}/${id}/pending-requests?page=${page}&size=20`);
export const groupCreate = (kind: GroupKind, body: GroupCreate) => apiPost<GroupInfo>(base(kind), { ...body, ...(kind === "guilds" ? { emblemImageUrl: null, emblemBgColor: null } : { bannerImageUrl: null, bannerBgColor: null }) });
export const groupCommand = (kind: GroupKind, id: number, action: string, body: object = {}) => apiPost<void | GroupInfo>(`${base(kind)}/${id}/${action}`, body);
