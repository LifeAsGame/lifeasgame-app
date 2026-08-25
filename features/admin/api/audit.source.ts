import type { AdminAuditPage, AdminAuditQuery } from "../model";
import { getAdminAuditEvents } from "./audit";
import { getMockAdminAuditEvents } from "./audit.mock";
import { resolveAdminDataSourceMode } from "./source";
import type { AdminDataSourceDescriptor } from "./source";

export { resolveAdminDataSourceMode } from "./source";
export type { AdminDataSourceDescriptor, AdminDataSourceMode } from "./source";

export type AdminAuditDataSource = {
  descriptor: AdminDataSourceDescriptor & { eventLabel: string };
  getEvents: (query: AdminAuditQuery) => Promise<AdminAuditPage>;
};

const API_SOURCE: AdminAuditDataSource = {
  descriptor: { mode: "api", badge: "API", label: "/admin/v1", eventLabel: "/admin/v1/audit-events" },
  getEvents: getAdminAuditEvents,
};

const MOCK_SOURCE: AdminAuditDataSource = {
  descriptor: { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", eventLabel: "Local Admin Mock" },
  getEvents: getMockAdminAuditEvents,
};

export function getAdminAuditDataSource(value: unknown): AdminAuditDataSource {
  return resolveAdminDataSourceMode(value) === "mock" ? MOCK_SOURCE : API_SOURCE;
}

export const adminAuditDataSource = getAdminAuditDataSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
