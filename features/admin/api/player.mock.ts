import { ApiError } from "@/shared/api/client";
import type { AdminPlayerInfo, AdminPlayerSummary } from "../player/model";
import { requirePositiveAdminPlayerId } from "./player.query";

const SUMMARY: AdminPlayerSummary = { playerId: 10218, userId: 8314, name: "HANEUL" };
const INFO: AdminPlayerInfo = {
  playerId: 10218,
  name: "HANEUL",
  gender: "FEMALE",
  job: "KNIGHT",
  level: 17,
  totalExp: 48200,
  currentHealth: 840,
  healthCapacity: 1000,
  currentMana: 310,
  manaCapacity: 420,
  str: 32,
  agi: 28,
  dex: 30,
  intel: 19,
  vit: 34,
  luc: 14,
  effects: [{ code: "FOCUSED", category: "BUFF" }],
  representativeTitleId: 41,
};

const notFound = () => new ApiError(404, "PLAYER_NOT_FOUND", "Player was not found.");

export async function lookupMockAdminPlayerByUserId(userId: number): Promise<AdminPlayerSummary> {
  requirePositiveAdminPlayerId(userId, "userId");
  if (userId !== SUMMARY.userId) throw notFound();
  return { ...SUMMARY };
}

export async function getMockAdminPlayerById(playerId: number): Promise<AdminPlayerInfo> {
  requirePositiveAdminPlayerId(playerId, "playerId");
  if (playerId !== INFO.playerId) throw notFound();
  return { ...INFO, effects: INFO.effects.map((effect) => ({ ...effect })) };
}
