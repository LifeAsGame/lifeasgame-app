import type { AdminPlayerInfo, AdminPlayerSummary } from "../player/model";
import { getAdminPlayerById, lookupAdminPlayerByUserId } from "./player";
import { getMockAdminPlayerById, lookupMockAdminPlayerByUserId } from "./player.mock";
import { resolveAdminDataSourceMode } from "./source";
import type { AdminDataSourceDescriptor } from "./source";

export type AdminPlayerDataSource = {
  descriptor: AdminDataSourceDescriptor & { playerLabel: string };
  lookupByUserId: (userId: number) => Promise<AdminPlayerSummary>;
  getByPlayerId: (playerId: number) => Promise<AdminPlayerInfo>;
};

const API_SOURCE: AdminPlayerDataSource = {
  descriptor: { mode: "api", badge: "API", label: "/admin/v1", playerLabel: "/admin/v1/players" },
  lookupByUserId: lookupAdminPlayerByUserId,
  getByPlayerId: getAdminPlayerById,
};

const MOCK_SOURCE: AdminPlayerDataSource = {
  descriptor: { mode: "mock", badge: "MOCK DATA", label: "Local Admin Mock", playerLabel: "Local Admin Mock" },
  lookupByUserId: lookupMockAdminPlayerByUserId,
  getByPlayerId: getMockAdminPlayerById,
};

export function getAdminPlayerDataSource(value: unknown): AdminPlayerDataSource {
  return resolveAdminDataSourceMode(value) === "mock" ? MOCK_SOURCE : API_SOURCE;
}

export const adminPlayerDataSource = getAdminPlayerDataSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
