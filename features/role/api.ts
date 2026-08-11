import { USE_MOCK, apiDelete, apiGet, apiPatch, apiPost, apiPut } from "@/shared/api/client";
import type {
  CreateRoleRelationRequest,
  CreateRoleRequest,
  PersonDetail,
  PersonInput,
  RoleDetail,
  RoleEventDetail,
  RoleEventInput,
  RoleRelationDetail,
  UpdateRoleRelationRequest,
  UpdateRoleRequest,
} from "@/shared/api/types";
import { roleMock } from "./mock";

export async function listRolesApi(): Promise<RoleDetail[]> {
  return USE_MOCK ? roleMock.listRoles() : apiGet<RoleDetail[]>("/api/v1/roles");
}

export async function getRoleApi(roleId: number): Promise<RoleDetail> {
  return USE_MOCK ? roleMock.getRole(roleId) : apiGet<RoleDetail>(`/api/v1/roles/${roleId}`);
}

export async function createRoleApi(body: CreateRoleRequest): Promise<RoleDetail> {
  return USE_MOCK ? roleMock.createRole(body) : apiPost<RoleDetail>("/api/v1/roles", body);
}

export async function updateRoleApi(roleId: number, body: UpdateRoleRequest): Promise<RoleDetail> {
  return USE_MOCK ? roleMock.updateRole(roleId, body) : apiPut<RoleDetail>(`/api/v1/roles/${roleId}`, body);
}

export async function archiveRoleApi(roleId: number): Promise<void> {
  if (USE_MOCK) return roleMock.archiveRole(roleId);
  return apiDelete<void>(`/api/v1/roles/${roleId}`);
}

export async function listPersonsApi(): Promise<PersonDetail[]> {
  return USE_MOCK ? roleMock.listPersons() : apiGet<PersonDetail[]>("/api/v1/persons");
}

export async function getPersonApi(personId: number): Promise<PersonDetail> {
  return USE_MOCK ? roleMock.getPerson(personId) : apiGet<PersonDetail>(`/api/v1/persons/${personId}`);
}

export async function createPersonApi(body: PersonInput): Promise<PersonDetail> {
  return USE_MOCK ? roleMock.createPerson(body) : apiPost<PersonDetail>("/api/v1/persons", body);
}

export async function updatePersonApi(personId: number, body: PersonInput): Promise<PersonDetail> {
  return USE_MOCK ? roleMock.updatePerson(personId, body) : apiPut<PersonDetail>(`/api/v1/persons/${personId}`, body);
}

export async function archivePersonApi(personId: number): Promise<void> {
  if (USE_MOCK) return roleMock.archivePerson(personId);
  return apiDelete<void>(`/api/v1/persons/${personId}`);
}

export async function listRoleRelationsApi(roleId: number): Promise<RoleRelationDetail[]> {
  return USE_MOCK ? roleMock.listRelations(roleId) : apiGet<RoleRelationDetail[]>(`/api/v1/roles/${roleId}/relations`);
}

export async function getRoleRelationApi(roleId: number, relationId: number): Promise<RoleRelationDetail> {
  return USE_MOCK ? roleMock.getRelation(roleId, relationId) : apiGet<RoleRelationDetail>(`/api/v1/roles/${roleId}/relations/${relationId}`);
}

export async function createRoleRelationApi(roleId: number, body: CreateRoleRelationRequest): Promise<RoleRelationDetail> {
  return USE_MOCK ? roleMock.createRelation(roleId, body) : apiPost<RoleRelationDetail>(`/api/v1/roles/${roleId}/relations`, body);
}

export async function updateRoleRelationApi(roleId: number, relationId: number, body: UpdateRoleRelationRequest): Promise<RoleRelationDetail> {
  return USE_MOCK ? roleMock.updateRelation(roleId, relationId, body) : apiPut<RoleRelationDetail>(`/api/v1/roles/${roleId}/relations/${relationId}`, body);
}

export async function archiveRoleRelationApi(roleId: number, relationId: number): Promise<void> {
  if (USE_MOCK) return roleMock.archiveRelation(roleId, relationId);
  return apiDelete<void>(`/api/v1/roles/${roleId}/relations/${relationId}`);
}

export async function listRoleEventsApi(roleId: number): Promise<RoleEventDetail[]> {
  return USE_MOCK ? roleMock.listEvents(roleId) : apiGet<RoleEventDetail[]>(`/api/v1/roles/${roleId}/events`);
}

export async function getRoleEventApi(roleId: number, eventId: number): Promise<RoleEventDetail> {
  return USE_MOCK ? roleMock.getEvent(roleId, eventId) : apiGet<RoleEventDetail>(`/api/v1/roles/${roleId}/events/${eventId}`);
}

export async function createRoleEventApi(roleId: number, body: RoleEventInput): Promise<RoleEventDetail> {
  return USE_MOCK ? roleMock.createEvent(roleId, body) : apiPost<RoleEventDetail>(`/api/v1/roles/${roleId}/events`, body);
}

export async function updateRoleEventApi(roleId: number, eventId: number, body: RoleEventInput): Promise<RoleEventDetail> {
  return USE_MOCK ? roleMock.updateEvent(roleId, eventId, body) : apiPatch<RoleEventDetail>(`/api/v1/roles/${roleId}/events/${eventId}`, body);
}

export async function completeRoleEventApi(roleId: number, eventId: number): Promise<RoleEventDetail> {
  return USE_MOCK ? roleMock.transitionEvent(roleId, eventId, "COMPLETED") : apiPost<RoleEventDetail>(`/api/v1/roles/${roleId}/events/${eventId}/complete`, {});
}

export async function cancelRoleEventApi(roleId: number, eventId: number): Promise<RoleEventDetail> {
  return USE_MOCK ? roleMock.transitionEvent(roleId, eventId, "CANCELED") : apiPost<RoleEventDetail>(`/api/v1/roles/${roleId}/events/${eventId}/cancel`, {});
}
