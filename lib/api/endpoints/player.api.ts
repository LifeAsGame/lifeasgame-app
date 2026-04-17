import { USE_MOCK, apiGet, apiPut } from "../client";
import {
  MOCK_ACHIEVEMENTS,
  MOCK_CHARACTER_SHEET,
  MOCK_CERTIFICATIONS,
  MOCK_HOBBIES,
  MOCK_TITLES,
} from "../mock/player.mock";
import type {
  CharacterSheet,
  PlayerAchievementInfo,
  PlayerCertificationInfo,
  PlayerHobbyInfo,
  PlayerTitleInfo,
} from "../types";

export async function getCharacterSheetApi(): Promise<CharacterSheet> {
  if (USE_MOCK) return MOCK_CHARACTER_SHEET;
  return apiGet<CharacterSheet>("/api/v1/players/me/sheet");
}

export async function getAchievementsApi(): Promise<PlayerAchievementInfo[]> {
  if (USE_MOCK) return MOCK_ACHIEVEMENTS;
  const res = await apiGet<{ infos: PlayerAchievementInfo[] }>("/api/v1/players/me/achievements");
  return res.infos;
}

export async function getCertificationsApi(): Promise<PlayerCertificationInfo[]> {
  if (USE_MOCK) return MOCK_CERTIFICATIONS;
  const res = await apiGet<{ infos: PlayerCertificationInfo[] }>("/api/v1/players/me/certifications");
  return res.infos;
}

export async function getTitlesApi(): Promise<PlayerTitleInfo[]> {
  if (USE_MOCK) return MOCK_TITLES;
  const res = await apiGet<{ infos: PlayerTitleInfo[] }>("/api/v1/players/me/titles");
  return res.infos;
}

export async function getHobbiesApi(): Promise<PlayerHobbyInfo[]> {
  if (USE_MOCK) return MOCK_HOBBIES;
  const res = await apiGet<{ infos: PlayerHobbyInfo[] }>("/api/v1/players/me/hobbies");
  return res.infos;
}

export async function setRepresentativeTitleApi(titleId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiPut(`/api/v1/players/me/title/${titleId}`, {});
}
