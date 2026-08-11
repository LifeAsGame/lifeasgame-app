export interface RoleDetail {
  id: number;
  roleType: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type CreateRoleRequest = Pick<RoleDetail, "roleType" | "name" | "description">;
export type UpdateRoleRequest = CreateRoleRequest;

export interface PersonDetail {
  id: number;
  linkedUserId: number | null;
  displayName: string;
  notes: string | null;
  birthday: string | null;
  contact: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type PersonInput = Pick<PersonDetail, "displayName" | "notes" | "birthday" | "contact">;

export interface RoleRelationDetail {
  id: number;
  personId: number;
  personDisplayName: string;
  linkedUserId: number | null;
  relationType: string;
  roleNotes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface CreateRoleRelationRequest {
  personId: number;
  relationType: string;
  roleNotes: string | null;
}

export type UpdateRoleRelationRequest = Pick<CreateRoleRelationRequest, "relationType" | "roleNotes">;

export interface RoleEventParticipant {
  participantLinkId: number;
  participantType: "PERSON" | "SERVICE_USER";
  participantId: number;
}

export interface RoleEventDetail {
  id: number;
  roleId: number;
  title: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  status: "PLANNED" | "COMPLETED" | "CANCELED";
  completedAt: string | null;
  participants: RoleEventParticipant[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

export type RoleEventInput = Pick<RoleEventDetail, "title" | "description" | "startsAt" | "endsAt">;
