import { apiDelete, apiGet, apiPost } from "@/shared/api/client";
import type { ConnectionPage } from "@/shared/api/types";

export type PersonRoleContext = {
  relationId: number; roleId: number; personId: number; roleName: string; roleStatus: string;
  relationType: string; roleNotes: string | null; relationStatus: string; version: number;
};
export type RoleGroupType = "GUILD" | "PARTY" | "ROLE_PARTY";
export type RoleGroupCandidate = { groupType: RoleGroupType; groupId: number; name: string; memberRole: string };
export type RoleGroupIdentity = { linkId: number; roleId: number; groupType: RoleGroupType; groupId: number };
export type RoleGroupLink = RoleGroupIdentity & { access: "AVAILABLE" | "UNAVAILABLE"; group: RoleGroupCandidate | null };
export const groupKey = (row: { groupType: RoleGroupType; groupId: number }) => `${row.groupType}:${row.groupId}`;
export const groupTypeName = { GUILD: "길드", PARTY: "파티", ROLE_PARTY: "역할 소모임" };

export function personRoleContexts(personId: number, page = 0, includeArchived = false, keyword = "") {
  const query = new URLSearchParams({ page: String(page), size: "20", includeArchived: String(includeArchived), keyword });
  return apiGet<ConnectionPage<PersonRoleContext>>(`/api/v1/persons/${personId}/role-contexts?${query}`);
}
export function roleGroupLinks(roleId: number, page = 0) {
  return apiGet<ConnectionPage<RoleGroupLink>>(`/api/v1/roles/${roleId}/group-links?page=${page}&size=20`);
}
export function roleGroupCandidates(roleId: number, groupType: RoleGroupType, page = 0, keyword = "") {
  const query = new URLSearchParams({ groupType, page: String(page), size: "20", keyword });
  return apiGet<ConnectionPage<RoleGroupCandidate>>(`/api/v1/roles/${roleId}/group-link-candidates?${query}`);
}
export const linkRoleGroup = (roleId: number, group: Pick<RoleGroupCandidate, "groupType" | "groupId">) =>
  apiPost<RoleGroupIdentity>(`/api/v1/roles/${roleId}/group-links`, { groupType: group.groupType, groupId: group.groupId });
export const unlinkRoleGroup = (roleId: number, linkId: number) =>
  apiDelete<void>(`/api/v1/roles/${roleId}/group-links/${linkId}`);
