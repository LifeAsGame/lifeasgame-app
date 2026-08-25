import { apiGet } from "@/shared/api/client";
import type { AdminPlayerInfo, AdminPlayerSummary } from "../player/model";

export const ADMIN_PLAYERS_PATH = "/admin/v1/players";

function positiveId(value: number, field: string) {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${field} must be a positive integer.`);
  return value;
}

export function lookupAdminPlayerByUserId(userId: number): Promise<AdminPlayerSummary> {
  return apiGet<AdminPlayerSummary>(`${ADMIN_PLAYERS_PATH}?userId=${positiveId(userId, "userId")}`);
}

export function getAdminPlayerById(playerId: number): Promise<AdminPlayerInfo> {
  return apiGet<AdminPlayerInfo>(`${ADMIN_PLAYERS_PATH}/${positiveId(playerId, "playerId")}`);
}
