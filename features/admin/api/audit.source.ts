import type { AdminAuditPage, AdminAuditQuery } from "../model";
import { getAdminAuditEvents } from "./audit";
import { getMockAdminAuditEvents } from "./audit.mock";

export type AdminDataSourceMode = "api" | "mock";

export type AdminDataSourceDescriptor = {
  mode: AdminDataSourceMode;
  badge: "API" | "MOCK DATA";
  label: string;
  eventLabel: string;
};

export type AdminAuditDataSource = {
  descriptor: AdminDataSourceDescriptor;
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

export function resolveAdminDataSourceMode(value: unknown): AdminDataSourceMode {
  return value === "mock" ? "mock" : "api";
}

export function getAdminAuditDataSource(value: unknown): AdminAuditDataSource {
  return resolveAdminDataSourceMode(value) === "mock" ? MOCK_SOURCE : API_SOURCE;
}

export const adminAuditDataSource = getAdminAuditDataSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
