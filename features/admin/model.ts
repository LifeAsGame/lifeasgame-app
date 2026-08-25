export type AdminCapabilityState =
  | "SUPPORTED"
  | "GATED"
  | "DEFERRED"
  | "LEGACY"
  | "PRIVACY_GATED"
  | "READ_ONLY";

export type AdminAreaId = "dashboard" | "players" | "content" | "economy" | "social" | "system";

export type AdminArea = {
  id: AdminAreaId;
  label: string;
  shortLabel: string;
  state: AdminCapabilityState;
  reason: string;
};

export const ADMIN_AREAS: AdminArea[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "D", state: "DEFERRED", reason: "BACKEND_READ_MODEL_REQUIRED" },
  { id: "players", label: "Players", shortLabel: "P", state: "SUPPORTED", reason: "Exact User ID lookup and read-only Player detail are supported." },
  { id: "content", label: "Content", shortLabel: "C", state: "DEFERRED", reason: "Content administration is deferred to a later approved slice." },
  { id: "economy", label: "Economy", shortLabel: "E", state: "GATED", reason: "Economy commands are not enabled in the current Admin slice." },
  { id: "social", label: "Social & Trust", shortLabel: "S", state: "PRIVACY_GATED", reason: "Private social content is outside this Admin slice." },
  { id: "system", label: "System", shortLabel: "Y", state: "SUPPORTED", reason: "Admin Audit remains supported." },
];

export type AdminAuditResult = "SUCCESS" | "FAILED";

export type AdminAuditEvent = {
  id: number;
  actorUserId: number;
  action: string;
  targetType: string;
  targetId: string;
  reason: string | null;
  result: AdminAuditResult;
  correlationId: string;
  idempotencyKey: string | null;
  occurredAt: string;
};

export type AdminAuditPage = {
  items: AdminAuditEvent[];
  nextCursor: string | null;
};

export type AdminAuditQuery = {
  actorUserId?: number;
  action?: string;
  targetType?: string;
  targetId?: string;
  result?: AdminAuditResult;
  correlationId?: string;
  from?: string;
  to?: string;
  cursor?: string;
  size?: number;
};

export type AdminAccess = "loading" | "unauthenticated" | "ready";
