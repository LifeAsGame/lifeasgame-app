import { apiGet } from "@/shared/api/client";
import type { AdminPlayerInfo, AdminPlayerSummary } from "../player/model";
import { requirePositiveAdminPlayerId } from "./player.query";

export const ADMIN_PLAYERS_PATH = "/admin/v1/players";

export async function lookupAdminPlayerByUserId(userId: number): Promise<AdminPlayerSummary> {
  return apiGet<AdminPlayerSummary>(`${ADMIN_PLAYERS_PATH}?userId=${requirePositiveAdminPlayerId(userId, "userId")}`);
}

export async function getAdminPlayerById(playerId: number): Promise<AdminPlayerInfo> {
  return apiGet<AdminPlayerInfo>(`${ADMIN_PLAYERS_PATH}/${requirePositiveAdminPlayerId(playerId, "playerId")}`);
}
