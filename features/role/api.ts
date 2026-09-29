import { USE_MOCK, apiDelete, apiGet, apiPost, apiPut } from "@/shared/api/client";
import type {
  CreateRoleRelationRequest,
  CreateRoleRequest,
  PersonDetail,
  PersonInput,
  RoleDetail,
  RoleEventDetail,
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

// Older relation reads omit Person status. Active lists omit archived Persons,
// so use the owned detail read when a Person is absent from the supplied list.
export async function resolveRelationPersonStatus(relations: RoleRelationDetail[], persons: PersonDetail[] = []): Promise<RoleRelationDetail[]> {
  const statuses = new Map<number, Promise<string | null>>(persons.map((person) => [person.id, Promise.resolve(person.status)]));
  return Promise.all(relations.map(async (relation) => {
    if (relation.personStatus !== undefined) return relation;
    if (!statuses.has(relation.personId)) statuses.set(relation.personId, getPersonApi(relation.personId).then((person) => typeof person.status === "string" ? person.status : null).catch(() => null));
    return { ...relation, personStatus: await statuses.get(relation.personId) ?? null };
  }));
}
