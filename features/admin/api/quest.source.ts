import type {
  AdminQuestAcceptance,
  AdminQuestAcceptances,
  AdminQuestAcceptanceStatus,
  AdminQuestBlueprints,
  AdminQuestDefinition,
  AdminQuestDefinitions,
} from "../quest/model";
import {
  getAdminQuestAcceptance,
  getAdminQuestAcceptances,
  getAdminQuestCatalog,
  getAdminQuestDefinition,
  getAdminQuestDefinitions,
} from "./quest";
import {
  getMockAdminQuestAcceptance,
  getMockAdminQuestAcceptances,
  getMockAdminQuestCatalog,
  getMockAdminQuestDefinition,
  getMockAdminQuestDefinitions,
} from "./quest.mock";
import { resolveAdminDataSourceMode } from "./source";
import type { AdminDataSourceDescriptor } from "./source";

export type AdminQuestDataSource = {
  descriptor: AdminDataSourceDescriptor & { questLabel: string };
  getCatalog: () => Promise<AdminQuestBlueprints>;
  getDefinitions: () => Promise<AdminQuestDefinitions>;
  getDefinition: (questCode: string) => Promise<AdminQuestDefinition>;
  getAcceptances: (questCode: string, status?: AdminQuestAcceptanceStatus | "") => Promise<AdminQuestAcceptances>;
  getAcceptance: (acceptanceId: number) => Promise<AdminQuestAcceptance>;
};

const API_SOURCE: AdminQuestDataSource = {
  descriptor: { mode: "api", badge: "API", label: "/admin/v1", questLabel: "/admin/v1/quests" },
  getCatalog: getAdminQuestCatalog,
  getDefinitions: getAdminQuestDefinitions,
  getDefinition: getAdminQuestDefinition,
  getAcceptances: getAdminQuestAcceptances,
  getAcceptance: getAdminQuestAcceptance,
};

const MOCK_SOURCE: AdminQuestDataSource = {
  descriptor: { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", questLabel: "Local Admin Mock" },
  getCatalog: getMockAdminQuestCatalog,
  getDefinitions: getMockAdminQuestDefinitions,
  getDefinition: getMockAdminQuestDefinition,
  getAcceptances: getMockAdminQuestAcceptances,
  getAcceptance: getMockAdminQuestAcceptance,
};

export function getAdminQuestDataSource(value: unknown): AdminQuestDataSource {
  return resolveAdminDataSourceMode(value) === "mock" ? MOCK_SOURCE : API_SOURCE;
}

export const adminQuestDataSource = getAdminQuestDataSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
