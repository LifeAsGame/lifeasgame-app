import type {
  CreateRoleRelationRequest,
  PersonDetail,
  PersonInput,
  RoleDetail,
  RoleEventDetail,
  RoleEventInput,
  RoleRelationDetail,
  UpdateRoleRelationRequest,
  UpdateRoleRequest,
} from "@/shared/api/types";

const now = () => new Date().toISOString();
const nextId = (items: Array<{ id: number }>) => Math.max(0, ...items.map(({ id }) => id)) + 1;

let roles: RoleDetail[] = [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build dependable systems.", status: "ACTIVE", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-10T09:00:00Z", version: 0 },
  { id: 2, roleType: "FAMILY", name: "Family Member", description: "Be present for family.", status: "ACTIVE", createdAt: "2026-02-14T09:00:00Z", updatedAt: "2026-02-14T09:00:00Z", version: 0 },
];

let persons: PersonDetail[] = [
  { id: 1, linkedUserId: null, displayName: "Alex", notes: "College friend", birthday: null, contact: null, status: "ACTIVE", createdAt: "2026-02-01T09:00:00Z", updatedAt: "2026-02-01T09:00:00Z", version: 0 },
  { id: 2, linkedUserId: 42, displayName: "Morgan", notes: null, birthday: "1995-06-18", contact: null, status: "ACTIVE", createdAt: "2026-02-02T09:00:00Z", updatedAt: "2026-02-02T09:00:00Z", version: 0 },
];

type StoredRelation = RoleRelationDetail & { roleId: number };
let relations: StoredRelation[] = [
  { id: 1, roleId: 2, personId: 1, personDisplayName: "Alex", linkedUserId: null, relationType: "FRIEND", roleNotes: "Check in monthly", status: "ACTIVE", createdAt: "2026-02-15T09:00:00Z", updatedAt: "2026-02-15T09:00:00Z", version: 0 },
];

let events: RoleEventDetail[] = [
  { id: 1, roleId: 1, title: "Architecture review", description: "Review the next release boundary.", startsAt: "2026-08-20T01:00:00Z", endsAt: "2026-08-20T02:00:00Z", status: "PLANNED", completedAt: null, participants: [{ participantLinkId: 1, participantType: "PERSON", participantId: 1 }], createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z", version: 0 },
];

function active<T extends { status: string }>(items: T[]) {
  return items.filter(({ status }) => status === "ACTIVE");
}

function requireItem<T extends { id: number }>(items: T[], id: number, label: string): T {
  const item = items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`${label} not found.`);
  return item;
}

function findRelation(roleId: number, relationId: number) {
  return requireItem(relations.filter((relation) => relation.roleId === roleId), relationId, "Relation");
}

function relationDetail(relation: StoredRelation): RoleRelationDetail {
  return {
    id: relation.id,
    personId: relation.personId,
    personDisplayName: relation.personDisplayName,
    linkedUserId: relation.linkedUserId,
    relationType: relation.relationType,
    roleNotes: relation.roleNotes,
    status: relation.status,
    createdAt: relation.createdAt,
    updatedAt: relation.updatedAt,
    version: relation.version,
  };
}

export const roleMock = {
  listRoles: () => active(roles),
  getRole: (roleId: number) => requireItem(roles, roleId, "Role"),
  createRole: (body: UpdateRoleRequest) => {
    const timestamp = now();
    const created: RoleDetail = { id: nextId(roles), status: "ACTIVE", createdAt: timestamp, updatedAt: timestamp, version: 0, ...body };
    roles = [...roles, created];
    return created;
  },
  updateRole: (roleId: number, body: UpdateRoleRequest) => {
    const current = requireItem(roles, roleId, "Role");
    const updated = { ...current, ...body, updatedAt: now(), version: current.version + 1 };
    roles = roles.map((role) => role.id === roleId ? updated : role);
    return updated;
  },
  archiveRole: (roleId: number) => {
    const current = requireItem(roles, roleId, "Role");
    roles = roles.map((role) => role.id === roleId ? { ...current, status: "ARCHIVED", updatedAt: now(), version: current.version + 1 } : role);
  },
  listPersons: () => active(persons),
  getPerson: (personId: number) => requireItem(persons, personId, "Person"),
  createPerson: (body: PersonInput) => {
    const timestamp = now();
    const created: PersonDetail = { id: nextId(persons), linkedUserId: null, status: "ACTIVE", createdAt: timestamp, updatedAt: timestamp, version: 0, ...body };
    persons = [...persons, created];
    return created;
  },
  updatePerson: (personId: number, body: PersonInput) => {
    const current = requireItem(persons, personId, "Person");
    const updated = { ...current, ...body, updatedAt: now(), version: current.version + 1 };
    persons = persons.map((person) => person.id === personId ? updated : person);
    return updated;
  },
  archivePerson: (personId: number) => {
    const current = requireItem(persons, personId, "Person");
    persons = persons.map((person) => person.id === personId ? { ...current, status: "ARCHIVED", updatedAt: now(), version: current.version + 1 } : person);
  },
  listRelations: (roleId: number) => active(relations.filter((relation) => relation.roleId === roleId)).map(relationDetail),
  getRelation: (roleId: number, relationId: number) => relationDetail(findRelation(roleId, relationId)),
  createRelation: (roleId: number, body: CreateRoleRelationRequest) => {
    const person = requireItem(persons, body.personId, "Person");
    const timestamp = now();
    const created: StoredRelation = { id: nextId(relations), roleId, personDisplayName: person.displayName, linkedUserId: person.linkedUserId, status: "ACTIVE", createdAt: timestamp, updatedAt: timestamp, version: 0, ...body };
    relations = [...relations, created];
    return relationDetail(created);
  },
  updateRelation: (roleId: number, relationId: number, body: UpdateRoleRelationRequest) => {
    const current = findRelation(roleId, relationId);
    const updated = { ...current, ...body, updatedAt: now(), version: current.version + 1 };
    relations = relations.map((relation) => relation.id === relationId && relation.roleId === roleId ? updated : relation);
    return relationDetail(updated);
  },
  archiveRelation: (roleId: number, relationId: number) => {
    const current = findRelation(roleId, relationId);
    relations = relations.map((relation) => relation.id === relationId && relation.roleId === roleId ? { ...current, status: "ARCHIVED", updatedAt: now(), version: current.version + 1 } : relation);
  },
  listEvents: (roleId: number) => events.filter((event) => event.roleId === roleId),
  getEvent: (roleId: number, eventId: number) => requireItem(events.filter((event) => event.roleId === roleId), eventId, "Event"),
  createEvent: (roleId: number, body: RoleEventInput) => {
    const timestamp = now();
    const created: RoleEventDetail = { id: nextId(events), roleId, status: "PLANNED", completedAt: null, participants: [], createdAt: timestamp, updatedAt: timestamp, version: 0, ...body };
    events = [...events, created];
    return created;
  },
  updateEvent: (roleId: number, eventId: number, body: RoleEventInput) => {
    const current = roleMock.getEvent(roleId, eventId);
    const updated = { ...current, ...body, updatedAt: now(), version: current.version + 1 };
    events = events.map((event) => event.id === eventId && event.roleId === roleId ? updated : event);
    return updated;
  },
  transitionEvent: (roleId: number, eventId: number, status: "COMPLETED" | "CANCELED") => {
    const current = roleMock.getEvent(roleId, eventId);
    if (current.status !== "PLANNED") throw new Error("Only planned events can transition.");
    const updated: RoleEventDetail = { ...current, status, completedAt: status === "COMPLETED" ? now() : null, updatedAt: now(), version: current.version + 1 };
    events = events.map((event) => event.id === eventId && event.roleId === roleId ? updated : event);
    return updated;
  },
};
